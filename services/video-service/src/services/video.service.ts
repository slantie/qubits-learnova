import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../lib/prisma';
import { minioClient, getPresignedPutUrl, getPublicUrl, getStreamUrl } from '../lib/minio';
import { transcodeQueue } from '../lib/queue';
import { env } from '../config/env';
import { AppError } from '../middleware/errorHandler';
import type {
  UploadUrlRequest,
  UploadUrlResponse,
  VideoMetadata,
  TranscodeJobData,
  ALLOWED_VIDEO_MIMES,
} from '../types';

const currentProvider = env.storage.provider;

export async function createUploadUrl(data: UploadUrlRequest): Promise<UploadUrlResponse> {
  const videoId = uuidv4();
  const ext = data.originalName.split('.').pop() || 'mp4';
  const rawKey = `uploads/${videoId}/original.${ext}`;

  const video = await prisma.video.create({
    data: {
      id: videoId,
      originalName: data.originalName,
      mimeType: data.mimeType,
      fileSize: BigInt(data.fileSize),
      rawKey,
      storageProvider: currentProvider,
      callbackUrl: data.callbackUrl || env.defaultCallbackUrl,
      status: 'UPLOADING',
    },
  });

  const uploadUrl = await getPresignedPutUrl(env.storage.bucketRaw, rawKey);

  return { videoId: video.id, uploadUrl, rawKey };
}

export async function directUploadAndProcess(
  file: { path: string; originalname: string; mimetype: string; size: number },
  callbackUrl?: string,
  autoProcess = true
): Promise<VideoMetadata & { message: string }> {
  const videoId = uuidv4();
  const ext = file.originalname.split('.').pop() || 'mp4';
  const rawKey = `uploads/${videoId}/original.${ext}`;

  await minioClient.fPutObject(env.storage.bucketRaw, rawKey, file.path, {
    'Content-Type': file.mimetype,
  });

  const video = await prisma.video.create({
    data: {
      id: videoId,
      originalName: file.originalname,
      mimeType: file.mimetype,
      fileSize: BigInt(file.size),
      rawKey,
      storageProvider: currentProvider,
      callbackUrl: callbackUrl || env.defaultCallbackUrl,
      status: 'UPLOADED',
    },
  });

  let message = 'Video uploaded';

  if (autoProcess) {
    const jobData: TranscodeJobData = {
      videoId,
      rawKey,
      rawBucket: env.storage.bucketRaw,
      processedBucket: env.storage.bucketProcessed,
      resolutions: env.transcodeResolutions,
      callbackUrl: callbackUrl || env.defaultCallbackUrl,
    };

    await transcodeQueue.add(`transcode-${videoId}`, jobData, { jobId: videoId });
    message = 'Video uploaded and processing started';
  }

  return {
    message,
    videoId: video.id,
    status: video.status,
    storageProvider: video.storageProvider,
    duration: null,
    thumbnailUrl: null,
    streamUrl: null,
    resolutions: null,
    originalName: video.originalName,
    mimeType: video.mimeType,
    fileSize: video.fileSize.toString(),
    createdAt: video.createdAt,
    processedAt: null,
  };
}

export async function confirmUploadAndProcess(
  videoId: string,
  callbackUrl?: string
): Promise<void> {
  const video = await prisma.video.findUnique({ where: { id: videoId } });

  if (!video) {
    throw new AppError(404, `Video ${videoId} not found`);
  }

  if (video.status !== 'UPLOADING' && video.status !== 'UPLOADED') {
    throw new AppError(409, `Video is already ${video.status.toLowerCase()}`);
  }

  await prisma.video.update({
    where: { id: videoId },
    data: {
      status: 'UPLOADED',
      callbackUrl: callbackUrl || video.callbackUrl,
    },
  });

  const jobData: TranscodeJobData = {
    videoId,
    rawKey: video.rawKey,
    rawBucket: env.storage.bucketRaw,
    processedBucket: env.storage.bucketProcessed,
    resolutions: env.transcodeResolutions,
    callbackUrl: callbackUrl || video.callbackUrl || undefined,
  };

  await transcodeQueue.add(`transcode-${videoId}`, jobData, {
    jobId: videoId,
  });
}

export async function getVideoById(videoId: string): Promise<VideoMetadata> {
  const video = await prisma.video.findUnique({ where: { id: videoId } });

  if (!video) {
    throw new AppError(404, `Video ${videoId} not found`);
  }

  let thumbnailUrl: string | null = null;
  let streamUrl: string | null = null;

  if (video.thumbnailKey) {
    thumbnailUrl = getStreamUrl(video.id, 'thumbnail.jpg');
  }

  if (video.hlsKey) {
    streamUrl = getStreamUrl(video.id, 'hls/master.m3u8');
  }

  return {
    videoId: video.id,
    status: video.status,
    storageProvider: video.storageProvider,
    duration: video.duration,
    thumbnailUrl,
    streamUrl,
    resolutions: video.resolutions as Record<string, string> | null,
    originalName: video.originalName,
    mimeType: video.mimeType,
    fileSize: video.fileSize.toString(),
    createdAt: video.createdAt,
    processedAt: video.processedAt,
  };
}

export async function deleteVideo(videoId: string): Promise<void> {
  const video = await prisma.video.findUnique({ where: { id: videoId } });

  if (!video) {
    throw new AppError(404, `Video ${videoId} not found`);
  }

  const { minioClient } = await import('../lib/minio');

  try {
    await minioClient.removeObject(env.storage.bucketRaw, video.rawKey);
  } catch {
    // ignore
  }

  if (video.hlsKey) {
    try {
      const objectsList = minioClient.listObjects(
        env.storage.bucketProcessed,
        `processed/${videoId}/`,
        true
      );
      const objects: string[] = [];
      for await (const obj of objectsList) {
        objects.push(obj.name);
      }
      if (objects.length > 0) {
        await minioClient.removeObjects(env.storage.bucketProcessed, objects);
      }
    } catch {
      // ignore
    }
  }

  await prisma.video.delete({ where: { id: videoId } });
}

export async function listVideos(
  page = 1,
  limit = 20,
  status?: string
): Promise<{ videos: VideoMetadata[]; total: number }> {
  const where: any = { storageProvider: currentProvider };
  if (status) {
    where.status = status;
  }
  const skip = (page - 1) * limit;

  const [videos, total] = await Promise.all([
    prisma.video.findMany({ where, skip, take: limit, orderBy: { createdAt: 'desc' } }),
    prisma.video.count({ where }),
  ]);

  return {
    total,
    videos: videos.map((v) => ({
      videoId: v.id,
      status: v.status,
      storageProvider: v.storageProvider,
      duration: v.duration,
      thumbnailUrl: v.thumbnailKey ? getStreamUrl(v.id, 'thumbnail.jpg') : null,
      streamUrl: v.hlsKey ? getStreamUrl(v.id, 'hls/master.m3u8') : null,
      resolutions: v.resolutions as Record<string, string> | null,
      originalName: v.originalName,
      mimeType: v.mimeType,
      fileSize: v.fileSize.toString(),
      createdAt: v.createdAt,
      processedAt: v.processedAt,
    })),
  };
}

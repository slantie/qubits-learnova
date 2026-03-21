import { Worker, Job } from 'bullmq';
import ffmpeg from 'fluent-ffmpeg';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { prisma } from '../lib/prisma';
import { minioClient } from '../lib/minio';
import { generateServiceToken } from '../middleware/serviceAuth';
import { env } from '../config/env';
import { TRANSCODE_QUEUE, redisConnectionOpts } from '../lib/queue';
import type { TranscodeJobData, WebhookPayload } from '../types';

ffmpeg.setFfmpegPath(env.ffmpegPath);
ffmpeg.setFfprobePath(env.ffprobePath);

const RESOLUTION_MAP: Record<number, { width: number; height: number; bitrate: string }> = {
  360: { width: 640, height: 360, bitrate: '800k' },
  480: { width: 854, height: 480, bitrate: '1400k' },
  720: { width: 1280, height: 720, bitrate: '2800k' },
  1080: { width: 1920, height: 1080, bitrate: '5000k' },
};

async function downloadFromMinio(bucket: string, key: string, destPath: string): Promise<void> {
  await minioClient.fGetObject(bucket, key, destPath);
}

async function uploadToMinio(bucket: string, key: string, filePath: string): Promise<void> {
  await minioClient.fPutObject(bucket, key, filePath);
}

async function uploadDirectoryToMinio(
  bucket: string,
  prefix: string,
  dirPath: string
): Promise<void> {
  const files = fs.readdirSync(dirPath, { recursive: true }) as string[];
  for (const file of files) {
    const fullPath = path.join(dirPath, file);
    if (fs.statSync(fullPath).isFile()) {
      const key = `${prefix}/${file}`;
      await uploadToMinio(bucket, key, fullPath);
    }
  }
}

function probeDuration(filePath: string): Promise<number> {
  return new Promise((resolve, reject) => {
    ffmpeg.ffprobe(filePath, (err, metadata) => {
      if (err) return reject(err);
      resolve(metadata.format.duration || 0);
    });
  });
}

function generateThumbnail(inputPath: string, outputPath: string): Promise<void> {
  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .screenshots({
        timestamps: ['10%'],
        filename: 'thumbnail.jpg',
        folder: path.dirname(outputPath),
        size: '640x360',
      })
      .on('end', () => resolve())
      .on('error', (err) => reject(err));
  });
}

function transcodeToHLS(
  inputPath: string,
  outputDir: string,
  resolution: number
): Promise<void> {
  const config = RESOLUTION_MAP[resolution];
  if (!config) throw new Error(`Unknown resolution: ${resolution}`);

  const resDir = path.join(outputDir, `${resolution}p`);
  fs.mkdirSync(resDir, { recursive: true });

  return new Promise((resolve, reject) => {
    ffmpeg(inputPath)
      .outputOptions([
        `-vf scale=${config.width}:${config.height}`,
        `-b:v ${config.bitrate}`,
        '-codec:v libx264',
        '-codec:a aac',
        '-b:a 128k',
        '-hls_time 6',
        '-hls_list_size 0',
        '-hls_segment_filename',
        path.join(resDir, 'segment_%03d.ts'),
        '-f hls',
      ])
      .output(path.join(resDir, 'playlist.m3u8'))
      .on('end', () => resolve())
      .on('error', (err) => reject(err))
      .run();
  });
}

function generateMasterPlaylist(outputDir: string, resolutions: number[]): string {
  let manifest = '#EXTM3U\n#EXT-X-VERSION:3\n';

  for (const res of resolutions.sort((a, b) => a - b)) {
    const config = RESOLUTION_MAP[res];
    if (!config) continue;
    manifest += `#EXT-X-STREAM-INF:BANDWIDTH=${parseInt(config.bitrate) * 1000},RESOLUTION=${config.width}x${config.height}\n`;
    manifest += `${res}p/playlist.m3u8\n`;
  }

  const masterPath = path.join(outputDir, 'master.m3u8');
  fs.writeFileSync(masterPath, manifest);
  return masterPath;
}

async function sendWebhook(callbackUrl: string, payload: WebhookPayload): Promise<void> {
  try {
    const token = generateServiceToken();
    await fetch(callbackUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    });
    console.log(`[Webhook] Sent ${payload.event} to ${callbackUrl}`);
  } catch (err) {
    console.error(`[Webhook] Failed to notify ${callbackUrl}:`, err);
  }
}

async function processJob(job: Job<TranscodeJobData>): Promise<void> {
  const { videoId, rawKey, rawBucket, processedBucket, resolutions, callbackUrl } = job.data;
  const tmpDir = path.join(os.tmpdir(), `learnova-transcode-${videoId}`);
  const hlsDir = path.join(tmpDir, 'hls');

  console.log(`[Worker] Starting transcode for video ${videoId}`);

  try {
    fs.mkdirSync(hlsDir, { recursive: true });

    await prisma.video.update({
      where: { id: videoId },
      data: { status: 'PROCESSING' },
    });
    await job.updateProgress(5);

    // 1. Download raw video
    const rawPath = path.join(tmpDir, 'raw_video');
    await downloadFromMinio(rawBucket, rawKey, rawPath);
    await job.updateProgress(15);

    // 2. Extract duration
    const duration = await probeDuration(rawPath);
    await prisma.video.update({ where: { id: videoId }, data: { duration } });
    await job.updateProgress(20);

    // 3. Generate thumbnail
    const thumbnailPath = path.join(tmpDir, 'thumbnail.jpg');
    await generateThumbnail(rawPath, thumbnailPath);
    const thumbnailKey = `processed/${videoId}/thumbnail.jpg`;
    await uploadToMinio(processedBucket, thumbnailKey, thumbnailPath);
    await job.updateProgress(30);

    // 4. Transcode each resolution
    const resolutionKeys: Record<string, string> = {};
    const progressPerRes = 50 / resolutions.length;

    for (let i = 0; i < resolutions.length; i++) {
      const res = resolutions[i];
      console.log(`[Worker] Transcoding ${videoId} @ ${res}p`);
      await transcodeToHLS(rawPath, hlsDir, res);
      resolutionKeys[`${res}p`] = `processed/${videoId}/hls/${res}p/playlist.m3u8`;
      await job.updateProgress(30 + Math.round(progressPerRes * (i + 1)));
    }

    // 5. Generate master playlist
    generateMasterPlaylist(hlsDir, resolutions);
    await job.updateProgress(85);

    // 6. Upload all HLS files to MinIO
    await uploadDirectoryToMinio(processedBucket, `processed/${videoId}/hls`, hlsDir);
    const hlsKey = `processed/${videoId}/hls/master.m3u8`;
    await job.updateProgress(95);

    // 7. Update database
    const now = new Date();
    await prisma.video.update({
      where: { id: videoId },
      data: {
        status: 'READY',
        thumbnailKey,
        hlsKey,
        resolutions: resolutionKeys,
        processedAt: now,
      },
    });

    // 8. Send webhook
    if (callbackUrl) {
      const { getStreamUrl } = await import('../lib/minio');
      await sendWebhook(callbackUrl, {
        event: 'video.ready',
        videoId,
        status: 'READY',
        duration,
        thumbnailUrl: getStreamUrl(videoId, 'thumbnail.jpg'),
        streamUrl: getStreamUrl(videoId, 'hls/master.m3u8'),
        resolutions: resolutionKeys,
        processedAt: now,
      });
    }

    await job.updateProgress(100);
    console.log(`[Worker] Transcode complete for ${videoId}`);
  } catch (err: any) {
    console.error(`[Worker] Transcode failed for ${videoId}:`, err);

    await prisma.video.update({
      where: { id: videoId },
      data: {
        status: 'FAILED',
        errorMessage: err.message || 'Unknown error',
      },
    });

    if (callbackUrl) {
      await sendWebhook(callbackUrl, {
        event: 'video.failed',
        videoId,
        status: 'FAILED',
        errorMessage: err.message,
      });
    }

    throw err;
  } finally {
    // Cleanup temp directory
    try {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // ignore cleanup errors
    }
  }
}

// ─── Start the worker ────────────────────────────────────────────────────────
const worker = new Worker(TRANSCODE_QUEUE, processJob, {
  connection: redisConnectionOpts,
  concurrency: env.maxConcurrentJobs,
});

worker.on('completed', (job) => {
  console.log(`[Worker] Job ${job.id} completed`);
});

worker.on('failed', (job, err) => {
  console.error(`[Worker] Job ${job?.id} failed:`, err.message);
});

worker.on('ready', () => {
  console.log(`[Worker] Transcode worker ready (concurrency: ${env.maxConcurrentJobs})`);
});

process.on('SIGTERM', async () => {
  console.log('[Worker] Shutting down...');
  await worker.close();
  await prisma.$disconnect();
  process.exit(0);
});

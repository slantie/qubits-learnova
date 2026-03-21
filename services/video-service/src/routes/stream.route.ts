import { Router, Request, Response } from 'express';
import { minioClient } from '../lib/minio';
import { prisma } from '../lib/prisma';
import { env } from '../config/env';

const router = Router();

const MIME_MAP: Record<string, string> = {
  '.m3u8': 'application/vnd.apple.mpegurl',
  '.ts': 'video/mp2t',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
};

function getMime(path: string): string {
  const ext = path.substring(path.lastIndexOf('.'));
  return MIME_MAP[ext] || 'application/octet-stream';
}

/**
 * GET /api/stream/:videoId/*
 *
 * Proxies HLS files (and thumbnails) from the storage bucket to the browser.
 * This avoids CORS and auth issues when accessing private S3 objects.
 *
 * e.g. /api/stream/<id>/hls/master.m3u8
 *      /api/stream/<id>/hls/720p/playlist.m3u8
 *      /api/stream/<id>/hls/720p/segment_003.ts
 *      /api/stream/<id>/thumbnail.jpg
 */
router.get('/:videoId/{*filePath}', async (req: Request, res: Response) => {
  try {
    const videoId = req.params.videoId as string;
    const rawPath = (req.params as any).filePath;
    // Express 5 {*filePath} returns an array of segments, e.g. ['hls', 'master.m3u8']
    const filePath = Array.isArray(rawPath)
      ? rawPath.join('/')
      : String(rawPath || '').replace(/^\/+/, '');

    if (!videoId || !filePath) {
      res.status(400).json({ error: 'Missing videoId or file path' });
      return;
    }

    // Basic path traversal protection
    if (filePath.includes('..')) {
      res.status(400).json({ error: 'Invalid path' });
      return;
    }

    const video = await prisma.video.findUnique({
      where: { id: videoId },
      select: { id: true, status: true, storageProvider: true },
    });

    if (!video) {
      res.status(404).json({ error: 'Video not found' });
      return;
    }

    if (video.storageProvider !== env.storage.provider) {
      res.status(404).json({
        error: `Video stored in "${video.storageProvider}" but server is running in "${env.storage.provider}" mode`,
      });
      return;
    }

    const objectKey = `processed/${videoId}/${filePath}`;
    const bucket = env.storage.bucketProcessed;

    const stream = await minioClient.getObject(bucket, objectKey);

    res.setHeader('Content-Type', getMime(filePath));
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('Access-Control-Allow-Origin', '*');

    stream.pipe(res);

    stream.on('error', () => {
      if (!res.headersSent) {
        res.status(404).json({ error: 'File not found in storage' });
      }
    });
  } catch (err: any) {
    if (!res.headersSent) {
      const status = err?.code === 'NoSuchKey' ? 404 : 500;
      res.status(status).json({ error: err.message || 'Stream error' });
    }
  }
});

export default router;

import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import fs from 'fs';
import * as videoService from '../services/video.service';
import { ALLOWED_VIDEO_MIMES, MAX_VIDEO_SIZE } from '../types';

const uploadUrlSchema = z.object({
  originalName: z.string().min(1),
  mimeType: z.enum(ALLOWED_VIDEO_MIMES as unknown as [string, ...string[]]),
  fileSize: z.number().int().positive().max(MAX_VIDEO_SIZE),
  callbackUrl: z.string().url().optional(),
});

const processSchema = z.object({
  callbackUrl: z.string().url().optional(),
});

export async function uploadVideo(req: Request, res: Response, next: NextFunction) {
  const tempPath = req.file?.path;
  try {
    const file = req.file;
    if (!file || !file.path) {
      res.status(400).json({ error: 'No video file provided. Use form-data with key "video".' });
      return;
    }

    const allowed = ALLOWED_VIDEO_MIMES as readonly string[];
    if (!allowed.includes(file.mimetype)) {
      res.status(400).json({
        error: `Invalid file type: ${file.mimetype}. Allowed: ${allowed.join(', ')}`,
      });
      return;
    }

    if (file.size > MAX_VIDEO_SIZE) {
      res.status(400).json({ error: `File too large. Max size: ${MAX_VIDEO_SIZE} bytes (5 GB)` });
      return;
    }

    const callbackUrl = req.body?.callbackUrl;
    const autoProcess = req.body?.autoProcess !== 'false';

    const result = await videoService.directUploadAndProcess(
      { path: file.path, originalname: file.originalname, mimetype: file.mimetype, size: file.size },
      callbackUrl,
      autoProcess
    );

    res.status(201).json(result);
  } catch (err) {
    next(err);
  } finally {
    if (tempPath) {
      fs.unlink(tempPath, () => {});
    }
  }
}

export async function createUploadUrl(req: Request, res: Response, next: NextFunction) {
  try {
    const data = uploadUrlSchema.parse(req.body);
    const result = await videoService.createUploadUrl(data);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
}

export async function processVideo(req: Request, res: Response, next: NextFunction) {
  try {
    const videoId = req.params.videoId as string;
    const body = processSchema.parse(req.body);
    await videoService.confirmUploadAndProcess(videoId, body.callbackUrl);
    res.json({ message: 'Processing started', videoId });
  } catch (err) {
    next(err);
  }
}

export async function getVideo(req: Request, res: Response, next: NextFunction) {
  try {
    const videoId = req.params.videoId as string;
    const video = await videoService.getVideoById(videoId);
    res.json(video);
  } catch (err) {
    next(err);
  }
}

export async function deleteVideo(req: Request, res: Response, next: NextFunction) {
  try {
    const videoId = req.params.videoId as string;
    await videoService.deleteVideo(videoId);
    res.json({ message: 'Video deleted', videoId });
  } catch (err) {
    next(err);
  }
}

export async function listVideos(req: Request, res: Response, next: NextFunction) {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const limit = Math.min(parseInt(req.query.limit as string) || 20, 100);
    const status = (req.query.status as string) || undefined;
    const result = await videoService.listVideos(page, limit, status);
    res.json(result);
  } catch (err) {
    next(err);
  }
}

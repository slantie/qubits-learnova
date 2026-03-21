import { Router, Request, Response, NextFunction } from 'express';
import prisma from '../../lib/prisma';
import { verifyServiceToken, generateClientUploadToken } from '../../lib/videoService';
import { authenticate } from '../../middleware/authenticate';
import { authorize } from '../../middleware/authorize';

const router = Router();

// ─── GET /api/videos/token ────────────────────────────────────────────────────
// Returns a short-lived JWT so the browser can upload directly to the video
// service, bypassing Next.js body size limits.
router.get(
  '/token',
  authenticate,
  authorize('ADMIN', 'INSTRUCTOR'),
  (_req: Request, res: Response, next: NextFunction) => {
    try {
      const token = generateClientUploadToken();
      res.json({ token });
    } catch (err) {
      next(err);
    }
  },
);

// ─── POST /api/webhooks/video ─────────────────────────────────────────────────
// Receives video.ready / video.failed events from the video service.
// Verified with the shared SERVICE_AUTH_SECRET JWT.
router.post('/video', async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Verify the request came from the video service
    const authHeader = req.headers.authorization ?? '';
    const token = authHeader.replace(/^Bearer\s+/i, '');
    if (!token || !verifyServiceToken(token)) {
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    const { event, videoId, status, duration, streamUrl, thumbnailUrl, errorMessage } = req.body;
    console.log('[webhook] video event received:', { event, videoId, status });

    if (!videoId) {
      res.status(400).json({ error: 'videoId is required' });
      return;
    }

    // Find the lesson that holds this videoId
    const lesson = await prisma.lesson.findFirst({ where: { videoId } });
    if (!lesson) {
      console.warn('[webhook] no lesson found for videoId:', videoId);
      res.json({ ok: true });
      return;
    }
    console.log('[webhook] updating lesson', lesson.id, 'event:', event);

    if (event === 'video.ready') {
      await prisma.lesson.update({
        where: { id: lesson.id },
        data: {
          videoStatus: 'READY',
          videoUrl: streamUrl ?? null,
          thumbnailUrl: thumbnailUrl ?? null,
          duration: duration ? Math.round(duration) : null,
        },
      });
    } else if (event === 'video.failed') {
      await prisma.lesson.update({
        where: { id: lesson.id },
        data: {
          videoStatus: 'FAILED',
        },
      });
    }

    res.json({ ok: true });
  } catch (err) {
    next(err);
  }
});

export default router;

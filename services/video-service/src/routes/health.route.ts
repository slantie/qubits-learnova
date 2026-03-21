import { Router, Request, Response } from 'express';
import IORedis from 'ioredis';
import { prisma } from '../lib/prisma';
import { redisConnectionOpts } from '../lib/queue';
import { minioClient } from '../lib/minio';
import { env } from '../config/env';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  const checks: Record<string, string> = {};

  try {
    await prisma.$queryRaw`SELECT 1`;
    checks.database = 'ok';
  } catch {
    checks.database = 'error';
  }

  try {
    const redis = new IORedis({ ...redisConnectionOpts, lazyConnect: true });
    await redis.ping();
    await redis.quit();
    checks.redis = 'ok';
  } catch {
    checks.redis = 'error';
  }

  try {
    await minioClient.bucketExists(env.storage.bucketRaw);
    checks.storage = 'ok';
  } catch {
    checks.storage = 'error';
  }

  const allOk = Object.values(checks).every((v) => v === 'ok');

  res.status(allOk ? 200 : 503).json({
    status: allOk ? 'healthy' : 'degraded',
    service: 'video-service',
    checks,
    uptime: process.uptime(),
  });
});

export default router;

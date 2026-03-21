import { Queue } from 'bullmq';
import { env } from '../config/env';

export const redisConnectionOpts = {
  host: env.redis.host,
  port: env.redis.port,
  password: env.redis.password,
  maxRetriesPerRequest: null,
};

export const TRANSCODE_QUEUE = 'video-transcode';

export const transcodeQueue = new Queue(TRANSCODE_QUEUE, {
  connection: redisConnectionOpts,
  defaultJobOptions: {
    attempts: 3,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 200 },
  },
});

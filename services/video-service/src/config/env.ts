import dotenv from 'dotenv';
dotenv.config();

const storageProvider = (process.env.STORAGE_PROVIDER || 'local') as 'local' | 's3';

function buildStorageConfig() {
  const bucketRaw = process.env.STORAGE_BUCKET_RAW || 'video-raw';
  const bucketProcessed = process.env.STORAGE_BUCKET_PROCESSED || 'video-processed';

  if (storageProvider === 's3') {
    return {
      provider: 's3' as const,
      endpoint: 's3.amazonaws.com',
      port: 443,
      accessKey: process.env.AWS_ACCESS_KEY_ID!,
      secretKey: process.env.AWS_SECRET_ACCESS_KEY!,
      region: process.env.AWS_REGION || 'us-east-1',
      useSSL: true,
      bucketRaw,
      bucketProcessed,
      cdnUrl: process.env.CDN_URL || '',
    };
  }

  // local (MinIO)
  return {
    provider: 'local' as const,
    endpoint: process.env.MINIO_ENDPOINT || 'localhost',
    port: parseInt(process.env.MINIO_PORT || '9000', 10),
    accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
    secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin',
    region: 'us-east-1',
    useSSL: process.env.MINIO_USE_SSL === 'true',
    bucketRaw,
    bucketProcessed,
    cdnUrl: '',
  };
}

export const env = {
  nodeEnv: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '4001', 10),

  databaseUrl: process.env.DATABASE_URL!,

  serviceAuthSecret: process.env.SERVICE_AUTH_SECRET!,

  storage: buildStorageConfig(),

  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    password: process.env.REDIS_PASSWORD || undefined,
  },

  ffmpegPath: process.env.FFMPEG_PATH || 'ffmpeg',
  ffprobePath: process.env.FFPROBE_PATH || 'ffprobe',
  maxConcurrentJobs: parseInt(process.env.MAX_CONCURRENT_JOBS || '2', 10),
  transcodeResolutions: (process.env.TRANSCODE_RESOLUTIONS || '360,480,720,1080')
    .split(',')
    .map(Number),

  defaultCallbackUrl:
    process.env.DEFAULT_CALLBACK_URL || 'http://localhost:4000/api/webhooks/video',
} as const;

// Validate required vars
const required: string[] = ['DATABASE_URL', 'SERVICE_AUTH_SECRET'];

if (storageProvider === 's3') {
  required.push('AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY', 'AWS_REGION');
}

for (const key of required) {
  if (!process.env[key]) {
    throw new Error(`Missing required environment variable: ${key}`);
  }
}

console.log(`[Config] Storage provider: ${env.storage.provider}`);

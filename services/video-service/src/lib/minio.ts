import { Client } from 'minio';
import { S3Client, PutBucketCorsCommand } from '@aws-sdk/client-s3';
import { env } from '../config/env';

const s = env.storage;

// The minio client is S3-compatible — works with both MinIO and AWS S3
export const minioClient = new Client({
  endPoint: s.endpoint,
  port: s.provider === 's3' ? undefined! : s.port,
  useSSL: s.useSSL,
  accessKey: s.accessKey,
  secretKey: s.secretKey,
  region: s.region,
  ...(s.provider === 's3' ? { pathStyle: false } : {}),
});

// AWS S3 client used only for CORS configuration (minio client doesn't support it)
const s3Client = new S3Client({
  region: s.region,
  credentials: {
    accessKeyId: s.accessKey,
    secretAccessKey: s.secretKey,
  },
  ...(s.provider === 'local'
    ? {
        endpoint: `${s.useSSL ? 'https' : 'http'}://${s.endpoint}:${s.port}`,
        forcePathStyle: true,
      }
    : {}),
});

async function configureBucketCors(bucket: string): Promise<void> {
  try {
    await s3Client.send(
      new PutBucketCorsCommand({
        Bucket: bucket,
        CORSConfiguration: {
          CORSRules: [
            {
              AllowedHeaders: ['*'],
              AllowedMethods: ['GET', 'HEAD'],
              AllowedOrigins: ['*'],
              ExposeHeaders: ['Content-Length', 'Content-Type', 'ETag'],
              MaxAgeSeconds: 86400,
            },
          ],
        },
      })
    );
    console.log(`[Storage] CORS configured for bucket: ${bucket}`);
  } catch (err: any) {
    console.warn(`[Storage] Could not set CORS on ${bucket}: ${err.message}`);
  }
}

export async function ensureBuckets(): Promise<void> {
  for (const bucket of [s.bucketRaw, s.bucketProcessed]) {
    const exists = await minioClient.bucketExists(bucket);
    if (!exists) {
      if (s.provider === 's3') {
        await minioClient.makeBucket(bucket, s.region);
      } else {
        await minioClient.makeBucket(bucket);
      }
      console.log(`[Storage] Created bucket: ${bucket}`);
    }
  }

  // Set CORS on the processed bucket (only needed for S3 with CDN direct access)
  if (s.provider === 's3') {
    await configureBucketCors(s.bucketProcessed);
  }
}

export function getPresignedPutUrl(
  bucket: string,
  key: string,
  expirySeconds = 3600
): Promise<string> {
  return minioClient.presignedPutObject(bucket, key, expirySeconds);
}

export function getPresignedGetUrl(
  bucket: string,
  key: string,
  expirySeconds = 86400
): Promise<string> {
  return minioClient.presignedGetObject(bucket, key, expirySeconds);
}

/**
 * Returns a publicly accessible URL for an object.
 *
 * - local (MinIO): http://localhost:9000/<bucket>/<key>
 * - s3 with CDN:   https://cdn.example.com/<key>
 * - s3 without CDN: https://<bucket>.s3.<region>.amazonaws.com/<key>
 */
export function getPublicUrl(bucket: string, key: string): string {
  if (s.provider === 's3') {
    if (s.cdnUrl) {
      const base = s.cdnUrl.replace(/\/+$/, '');
      return `${base}/${key}`;
    }
    return `https://${bucket}.s3.${s.region}.amazonaws.com/${key}`;
  }

  // Local MinIO
  const protocol = s.useSSL ? 'https' : 'http';
  return `${protocol}://${s.endpoint}:${s.port}/${bucket}/${key}`;
}

/**
 * Returns a browser-accessible stream URL.
 *
 * Uses the /api/stream proxy for BOTH local and S3 to avoid CORS/auth issues.
 * The proxy fetches from whichever storage provider is configured and pipes
 * the response to the browser with correct headers.
 *
 * If CDN_URL is set (production with CloudFront), returns the CDN URL directly.
 *
 * @param videoId - The video's UUID
 * @param subPath - Path relative to processed/<videoId>/, e.g. "hls/master.m3u8" or "thumbnail.jpg"
 */
export function getStreamUrl(videoId: string, subPath: string): string {
  if (s.cdnUrl) {
    const base = s.cdnUrl.replace(/\/+$/, '');
    return `${base}/processed/${videoId}/${subPath}`;
  }

  const baseUrl = process.env.SERVICE_BASE_URL || `http://localhost:${env.port}`;
  return `${baseUrl}/api/stream/${videoId}/${subPath}`;
}

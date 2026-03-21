import jwt from 'jsonwebtoken';

const VIDEO_SERVICE_URL = process.env.VIDEO_SERVICE_URL ?? 'http://localhost:4001/api';
const SECRET = process.env.SERVICE_AUTH_SECRET ?? '';

/**
 * Generate a short-lived service-to-service JWT.
 * Used in Authorization: Bearer <token> headers to the video service.
 */
export function generateServiceToken(ttlSeconds = 300): string {
  if (!SECRET) throw new Error('SERVICE_AUTH_SECRET is not configured');
  return jwt.sign({ service: 'learnova-server' }, SECRET, { expiresIn: ttlSeconds });
}

/**
 * Generate a short-lived token suitable for giving to a browser client
 * so it can upload directly to the video service (bypasses Next.js size limits).
 * TTL is capped at 1 hour.
 */
export function generateClientUploadToken(): string {
  if (!SECRET) throw new Error('SERVICE_AUTH_SECRET is not configured');
  return jwt.sign({ service: 'learnova-client', type: 'upload' }, SECRET, { expiresIn: 3600 });
}

/**
 * Verify that an incoming webhook came from the video service.
 */
export function verifyServiceToken(token: string): boolean {
  try {
    jwt.verify(token, SECRET);
    return true;
  } catch {
    return false;
  }
}

/** Build the Authorization header object for server→video-service calls. */
export function serviceAuthHeaders(): Record<string, string> {
  return { Authorization: `Bearer ${generateServiceToken()}` };
}

/** Fetch video metadata from the video service. */
export async function getVideoFromService(videoId: string) {
  const res = await fetch(`${VIDEO_SERVICE_URL}/videos/${videoId}`, {
    headers: serviceAuthHeaders(),
  });
  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Video service error ${res.status}: ${body}`);
  }
  return res.json() as Promise<{
    id: string;
    status: 'UPLOADING' | 'UPLOADED' | 'PROCESSING' | 'READY' | 'FAILED';
    duration?: number;
    streamUrl?: string;
    thumbnailUrl?: string;
  }>;
}

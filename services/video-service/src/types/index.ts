export interface UploadUrlRequest {
  originalName: string;
  mimeType: string;
  fileSize: number;
  callbackUrl?: string;
}

export interface UploadUrlResponse {
  videoId: string;
  uploadUrl: string;
  rawKey: string;
}

export interface ProcessRequest {
  callbackUrl?: string;
}

export interface VideoMetadata {
  videoId: string;
  status: string;
  storageProvider: string;
  duration: number | null;
  thumbnailUrl: string | null;
  streamUrl: string | null;
  resolutions: Record<string, string> | null;
  originalName: string;
  mimeType: string;
  fileSize: string;
  createdAt: Date;
  processedAt: Date | null;
}

export interface WebhookPayload {
  event: 'video.ready' | 'video.failed';
  videoId: string;
  status: string;
  duration?: number;
  thumbnailUrl?: string;
  streamUrl?: string;
  resolutions?: Record<string, string>;
  errorMessage?: string;
  processedAt?: Date;
}

export interface TranscodeJobData {
  videoId: string;
  rawKey: string;
  rawBucket: string;
  processedBucket: string;
  resolutions: number[];
  callbackUrl?: string;
}

export const ALLOWED_VIDEO_MIMES = [
  'video/mp4',
  'video/quicktime',
  'video/webm',
  'video/x-msvideo',
  'video/x-matroska',
] as const;

export const MAX_VIDEO_SIZE = 5 * 1024 * 1024 * 1024; // 5 GB

# Learnova Video Service — Architecture & Deep Dive

## Table of Contents

- [Overview](#overview)
- [System Architecture](#system-architecture)
- [Project Structure](#project-structure)
- [Infrastructure](#infrastructure)
- [Storage Layer — Dual Provider](#storage-layer--dual-provider)
- [Authentication — Service-to-Service JWT](#authentication--service-to-service-jwt)
- [API Endpoints](#api-endpoints)
- [Upload Flows](#upload-flows)
- [Transcoding Pipeline](#transcoding-pipeline)
- [HLS Streaming & Stream Proxy](#hls-streaming--stream-proxy)
- [Webhook Notifications](#webhook-notifications)
- [Database Schema](#database-schema)
- [Video Lifecycle (State Machine)](#video-lifecycle-state-machine)
- [Configuration Reference](#configuration-reference)
- [Exposing with ngrok](#exposing-with-ngrok)
- [Production Deployment](#production-deployment)
- [Troubleshooting](#troubleshooting)

---

## Overview

The Video Service is an **independent microservice** that handles the full video lifecycle for the Learnova eLearning platform:

1. **Upload** — Accept video files (up to 5 GB) via direct upload or presigned URL
2. **Transcode** — Convert to HLS adaptive bitrate (360p, 480p, 720p, 1080p) using FFmpeg
3. **Thumbnail** — Auto-extract a thumbnail at 10% of video duration
4. **Stream** — Serve HLS playlists and segments with a built-in proxy (avoids CORS/auth issues)
5. **Notify** — Webhook callback to the main Learnova monolith when processing completes

**Stack:** TypeScript, Express 5, Prisma (PostgreSQL), BullMQ (Redis), MinIO / AWS S3, FFmpeg

---

## System Architecture

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                              CLIENT BROWSER                                  │
│                                                                              │
│  ┌─────────────┐   ┌────────────────┐   ┌──────────────────────────────┐    │
│  │ Upload Form │   │  Video Player  │   │  Video List (polling)        │    │
│  │ (multipart) │   │  (hls.js)      │   │  GET /api/videos?limit=50    │    │
│  └──────┬──────┘   └───────┬────────┘   └──────────────┬───────────────┘    │
│         │                  │                            │                    │
└─────────┼──────────────────┼────────────────────────────┼────────────────────┘
          │                  │                            │
          ▼                  ▼                            ▼
┌──────────────────────────────────────────────────────────────────────────────┐
│                         VIDEO SERVICE (Express, port 4001)                   │
│                                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────┐  ┌──────────────────┐   │
│  │  POST        │  │  GET         │  │  GET      │  │  GET /api/stream │   │
│  │  /videos/    │  │  /videos/:id │  │  /videos  │  │  /:id/{*path}   │   │
│  │  upload      │  │              │  │           │  │  (S3 proxy)      │   │
│  └──────┬───────┘  └──────┬───────┘  └─────┬─────┘  └────────┬─────────┘   │
│         │                 │                │                  │              │
│         ▼                 │                │                  │              │
│  ┌─────────────────┐     │                │                  │              │
│  │ video.service.ts │     │                │                  │              │
│  │ Upload to S3/    │     │                │                  │              │
│  │ MinIO, queue job │     │                │                  │              │
│  └────────┬────────┘     │                │                  │              │
│           │              │                │                  │              │
│           ▼              ▼                ▼                  ▼              │
│  ┌─────────────────────────────────────────────────────────────────────┐    │
│  │                     Prisma ORM (PostgreSQL)                         │    │
│  │                     Video metadata, status, keys                    │    │
│  └─────────────────────────────────────────────────────────────────────┘    │
│           │                                                                  │
│           ▼                                                                  │
│  ┌──────────────────┐        ┌──────────────────────────────────────────┐   │
│  │  BullMQ Queue    │───────►│  Transcode Worker (separate process)     │   │
│  │  (Redis)         │        │  FFmpeg → HLS segments + thumbnail       │   │
│  └──────────────────┘        │  Upload processed files → S3/MinIO       │   │
│                              │  Update DB → READY                       │   │
│                              │  Send webhook → monolith                 │   │
│                              └──────────────────────────────────────────┘   │
│                                                                              │
└──────────────────────────────────────────────────────────────────────────────┘
          │                                       │
          ▼                                       ▼
┌──────────────────┐                  ┌────────────────────────┐
│  Object Storage  │                  │  Learnova Monolith     │
│  MinIO (local)   │                  │  (receives webhook)    │
│  AWS S3 (prod)   │                  │  POST /api/webhooks/   │
│                  │                  │       video             │
└──────────────────┘                  └────────────────────────┘
```

---

## Project Structure

```
services/video-service/
├── src/
│   ├── config/
│   │   └── env.ts              # Centralized env parsing, storage provider toggle
│   ├── controllers/
│   │   └── video.controller.ts # Request validation, delegates to service layer
│   ├── lib/
│   │   ├── minio.ts            # S3/MinIO client, bucket init, CORS, URL helpers
│   │   ├── prisma.ts           # Prisma client singleton (with Prisma 7 adapter)
│   │   └── queue.ts            # BullMQ queue and Redis connection config
│   ├── middleware/
│   │   ├── errorHandler.ts     # Global error handler (AppError class)
│   │   └── serviceAuth.ts      # JWT verification + token generation
│   ├── routes/
│   │   ├── index.ts            # Route aggregator (/health, /videos, /stream)
│   │   ├── health.route.ts     # Health check (DB, Redis, Storage)
│   │   ├── video.route.ts      # CRUD + upload routes (auth required)
│   │   └── stream.route.ts     # HLS/thumbnail proxy (no auth, public)
│   ├── services/
│   │   └── video.service.ts    # Core business logic (upload, process, CRUD)
│   ├── types/
│   │   └── index.ts            # TypeScript interfaces and constants
│   ├── workers/
│   │   └── transcode.worker.ts # BullMQ worker: FFmpeg transcode + HLS
│   └── server.ts               # Express app bootstrap
├── prisma/
│   └── schema.prisma           # Database schema (Video model)
├── prisma.config.ts            # Prisma 7 config (datasource URL)
├── example-client/             # Next.js demo frontend
│   ├── app/
│   │   ├── api/token/route.ts  # Server-side JWT generation endpoint
│   │   ├── actions.ts          # Server actions
│   │   ├── page.tsx            # Main page
│   │   └── layout.tsx          # Root layout
│   ├── components/
│   │   ├── UploadForm.tsx      # Direct upload to video service
│   │   ├── VideoPlayer.tsx     # HLS player with quality selector
│   │   └── VideoList.tsx       # Video grid with polling
│   └── lib/
│       └── api.ts              # Server-side API client helpers
├── postman/                    # Postman collection + environment
├── scripts/
│   └── generate-token.ts       # CLI helper to generate JWT tokens
├── docker-compose.yml          # Local infra (PostgreSQL, Redis, MinIO)
├── Dockerfile                  # Production container image
├── .env                        # Local secrets (gitignored)
└── .env.example                # Template with placeholders
```

---

## Infrastructure

All infrastructure runs locally via Docker Compose:

| Service | Container | Port | Purpose |
|---------|-----------|------|---------|
| **PostgreSQL 16** | `learnova-video-db` | `5433` | Video metadata (Prisma ORM) |
| **Redis 7** | `learnova-video-redis` | `6379` | BullMQ job queue |
| **MinIO** | `learnova-video-minio` | `9000` (API), `9001` (Console) | S3-compatible object storage |

```bash
# Start all infrastructure
docker compose up -d

# View MinIO Console
open http://localhost:9001  # login: minioadmin / minioadmin
```

---

## Storage Layer — Dual Provider

The service supports two storage backends, toggled via a single env var:

```
STORAGE_PROVIDER=local    # Uses MinIO (development)
STORAGE_PROVIDER=s3       # Uses AWS S3 (production)
```

### How it works

Both MinIO and AWS S3 speak the same S3 protocol. The `minio` npm package is an S3-compatible client that connects to either:

```
┌─────────────────────────────────────────────────────┐
│                 env.ts                                │
│  STORAGE_PROVIDER=local │ STORAGE_PROVIDER=s3        │
│  ─────────────────────  │ ────────────────────       │
│  endpoint: localhost     │ endpoint: s3.amazonaws.com │
│  port: 9000              │ port: 443 (SSL)            │
│  accessKey: minioadmin   │ accessKey: AWS_ACCESS_KEY   │
│  secretKey: minioadmin   │ secretKey: AWS_SECRET_KEY   │
│  useSSL: false           │ useSSL: true                │
│  region: us-east-1       │ region: from AWS_REGION     │
└─────────────────────────────────────────────────────┘
                          │
                          ▼
              ┌───────────────────┐
              │ minio npm Client  │  ← Same client, different config
              │ (S3-compatible)   │
              └───────────────────┘
```

### URL Generation

| Provider | Thumbnail / Stream URL |
|----------|----------------------|
| **local** | `http://localhost:9000/video-processed/processed/<id>/hls/master.m3u8` |
| **s3** (no CDN) | `http://localhost:4001/api/stream/<id>/hls/master.m3u8` (proxy) |
| **s3** (with CDN) | `https://cdn.yourdomain.com/processed/<id>/hls/master.m3u8` |

When using S3, the stream proxy (`/api/stream`) fetches from the private S3 bucket server-side and pipes to the browser, avoiding CORS and authentication issues entirely.

### CORS Configuration

On startup, the service automatically configures CORS on the processed bucket using `@aws-sdk/client-s3`'s `PutBucketCorsCommand`. This allows direct browser access when using CDN URLs.

---

## Authentication — Service-to-Service JWT

All `/api/videos/*` endpoints require a JWT token in the `Authorization: Bearer <token>` header. The `/api/stream/*` and `/api/health` endpoints are public (no auth).

### How it works

```
┌─────────────────┐           ┌─────────────────┐
│   Monolith       │           │  Video Service   │
│   (caller)       │           │  (receiver)      │
│                  │           │                  │
│  1. jwt.sign(    │  HTTP     │  2. jwt.verify(  │
│    {service:     │──────────►│    token,         │
│     "monolith"}, │  Bearer   │    SERVICE_AUTH   │
│    SECRET,       │  <token>  │    _SECRET        │
│    {exp: "5m"})  │           │  )                │
│                  │           │                  │
└─────────────────┘           └─────────────────┘

Both services share the same SERVICE_AUTH_SECRET
```

### Token payload

```json
{
  "service": "learnova-server",  // Identifies the calling service
  "iat": 1711036800,             // Issued at (Unix timestamp)
  "exp": 1711037100              // Expires in 5 minutes
}
```

### Generate a token (CLI)

```bash
# From the video-service directory
npx ts-node scripts/generate-token.ts
```

### Generate a token (code)

```typescript
import jwt from 'jsonwebtoken';

const token = jwt.sign(
  { service: 'learnova-server' },
  process.env.SERVICE_AUTH_SECRET,
  { expiresIn: '5m' }
);

// Use: Authorization: Bearer <token>
```

### Security notes

- The secret is a 48-byte cryptographically random value (base64url-encoded)
- Tokens expire after 5 minutes (configurable)
- The secret must be identical across all services that communicate
- Never commit `.env` — use `.env.example` as a template
- Generate a new secret: `node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"`

---

## API Endpoints

### Public (no auth)

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Service health (DB, Redis, Storage status) |
| `GET` | `/api/stream/:videoId/{*filePath}` | Proxy HLS/thumbnails from S3 |

### Protected (requires `Authorization: Bearer <jwt>`)

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/videos/upload` | Direct file upload (multipart, up to 5 GB) |
| `POST` | `/api/videos/upload-url` | Get presigned URL for client-side upload |
| `POST` | `/api/videos/:videoId/process` | Trigger transcoding after presigned upload |
| `GET` | `/api/videos/:videoId` | Get single video metadata + URLs |
| `GET` | `/api/videos?page=1&limit=20&status=READY` | List videos (paginated, filterable) |
| `DELETE` | `/api/videos/:videoId` | Delete video + all S3 objects |

---

## Upload Flows

### Flow 1: Direct Upload (Recommended)

Simplest approach — the client sends the file directly to the video service.

```
Client                          Video Service                    S3/MinIO
  │                                  │                              │
  │  POST /api/videos/upload         │                              │
  │  (multipart: video file)         │                              │
  │ ────────────────────────────────►│                              │
  │                                  │  fPutObject(bucket, key,     │
  │                                  │             tempFile)         │
  │                                  │ ────────────────────────────►│
  │                                  │                              │
  │                                  │  Create DB record            │
  │                                  │  Queue transcode job         │
  │                                  │                              │
  │  201 { videoId, status }         │                              │
  │ ◄────────────────────────────────│                              │
```

The upload uses **disk-based** multer (not memory), so files stream to a temp directory
before being uploaded to S3 via `fPutObject`. This avoids loading multi-GB files into RAM.

### Flow 2: Presigned URL (Advanced)

For very large files or when you want the browser to upload directly to S3:

```
Client                 Monolith              Video Service            S3/MinIO
  │                       │                       │                      │
  │  1. Create lesson     │                       │                      │
  │ ─────────────────────►│                       │                      │
  │                       │  2. POST /upload-url   │                      │
  │                       │ ─────────────────────►│                      │
  │                       │  { videoId, uploadUrl } │                      │
  │                       │ ◄─────────────────────│                      │
  │  3. uploadUrl         │                       │                      │
  │ ◄─────────────────────│                       │                      │
  │                       │                       │                      │
  │  4. PUT uploadUrl     │                       │                      │
  │ ──────────────────────────────────────────────────────────────────►│
  │                       │                       │                      │
  │                       │  5. POST /:id/process  │                      │
  │                       │ ─────────────────────►│  Queue job            │
  │                       │                       │                      │
```

---

## Transcoding Pipeline

The transcode worker runs as a **separate process** (`npm run dev:worker`) consuming jobs from BullMQ.

### Pipeline steps

```
┌─────────────────────────────────────────────────────────────────┐
│                    Transcode Worker                               │
│                                                                   │
│  1. Download raw video from S3 → /tmp/learnova-transcode-<id>/   │
│                                                   [Progress: 15%] │
│  2. ffprobe → Extract duration                                    │
│                                                   [Progress: 20%] │
│  3. ffmpeg → Generate thumbnail (640x360 @ 10%)                   │
│     Upload thumbnail.jpg → S3                                     │
│                                                   [Progress: 30%] │
│  4. For each resolution (360p, 480p, 720p, 1080p):                │
│     ffmpeg → HLS segments (6s chunks, libx264, aac)               │
│     Output: <res>p/playlist.m3u8 + segment_XXX.ts                 │
│                                                   [Progress: 80%] │
│  5. Generate master.m3u8 (adaptive bitrate manifest)              │
│                                                   [Progress: 85%] │
│  6. Upload all HLS files → S3 (processed/<id>/hls/)               │
│                                                   [Progress: 95%] │
│  7. Update DB: status=READY, thumbnailKey, hlsKey, resolutions    │
│                                                                   │
│  8. Send webhook to monolith: { event: "video.ready", ... }       │
│                                                  [Progress: 100%] │
│                                                                   │
│  9. Cleanup: rm -rf /tmp/learnova-transcode-<id>/                 │
└─────────────────────────────────────────────────────────────────┘
```

### Resolution presets

| Resolution | Width × Height | Video Bitrate | Audio |
|-----------|---------------|--------------|-------|
| 360p | 640 × 360 | 800 kbps | AAC 128k |
| 480p | 854 × 480 | 1400 kbps | AAC 128k |
| 720p | 1280 × 720 | 2800 kbps | AAC 128k |
| 1080p | 1920 × 1080 | 5000 kbps | AAC 128k |

### Failure handling

- Jobs retry **3 times** with exponential backoff (5s, 10s, 20s)
- On failure: DB status → `FAILED`, `errorMessage` stored
- Failed webhook sent: `{ event: "video.failed", errorMessage: "..." }`
- Temp files cleaned up in `finally` block regardless of success/failure

### S3 output structure

```
video-processed/
└── processed/
    └── <videoId>/
        ├── thumbnail.jpg
        └── hls/
            ├── master.m3u8          ← Adaptive bitrate manifest
            ├── 360p/
            │   ├── playlist.m3u8
            │   ├── segment_000.ts
            │   ├── segment_001.ts
            │   └── ...
            ├── 480p/
            │   └── ...
            ├── 720p/
            │   └── ...
            └── 1080p/
                └── ...
```

---

## HLS Streaming & Stream Proxy

### The problem

When using AWS S3 in production, bucket objects are private. The browser can't fetch
`.m3u8` and `.ts` files directly — it gets 403 Forbidden + CORS errors.

### The solution: `/api/stream` proxy

```
Browser (hls.js)              Video Service                   AWS S3
     │                             │                             │
     │ GET /api/stream/<id>/       │                             │
     │     hls/master.m3u8        │                             │
     │ ──────────────────────────►│                             │
     │                             │ getObject(bucket, key)      │
     │                             │ ───────────────────────────►│
     │                             │ ◄─── stream ────────────────│
     │ ◄─── pipe stream ──────────│                             │
     │                             │                             │
     │ (hls.js resolves relative   │                             │
     │  URLs from master playlist) │                             │
     │                             │                             │
     │ GET /api/stream/<id>/       │                             │
     │     hls/720p/playlist.m3u8 │                             │
     │ ──────────────────────────►│  (same pattern)             │
     │                             │                             │
     │ GET /api/stream/<id>/       │                             │
     │     hls/720p/segment_003.ts│                             │
     │ ──────────────────────────►│  (same pattern)             │
```

The key insight: HLS playlists use **relative URLs**. If `master.m3u8` is served from
`/api/stream/<id>/hls/master.m3u8`, then hls.js automatically requests
`/api/stream/<id>/hls/720p/playlist.m3u8` — all going through the same proxy.

**Response headers set by proxy:**
- `Content-Type`: Correct MIME (`application/vnd.apple.mpegurl`, `video/mp2t`, etc.)
- `Cache-Control: public, max-age=86400` (24h cache for segments)
- `Access-Control-Allow-Origin: *`
- `Cross-Origin-Resource-Policy: cross-origin` (via helmet config)

---

## Webhook Notifications

When transcoding completes (or fails), the worker sends an HTTP POST to the configured
`callbackUrl` (defaults to the monolith at `http://localhost:4000/api/webhooks/video`).

### Success payload

```json
{
  "event": "video.ready",
  "videoId": "c53f8f0e-570d-45b6-b195-7710e0c3d44c",
  "status": "READY",
  "duration": 125.5,
  "thumbnailUrl": "http://localhost:4001/api/stream/<id>/thumbnail.jpg",
  "streamUrl": "http://localhost:4001/api/stream/<id>/hls/master.m3u8",
  "resolutions": {
    "360p": "processed/<id>/hls/360p/playlist.m3u8",
    "480p": "processed/<id>/hls/480p/playlist.m3u8",
    "720p": "processed/<id>/hls/720p/playlist.m3u8",
    "1080p": "processed/<id>/hls/1080p/playlist.m3u8"
  },
  "processedAt": "2026-03-21T12:30:00.000Z"
}
```

### Failure payload

```json
{
  "event": "video.failed",
  "videoId": "c53f8f0e-570d-45b6-b195-7710e0c3d44c",
  "status": "FAILED",
  "errorMessage": "FFmpeg exited with code 1: Invalid data found when processing input"
}
```

The webhook request includes `Authorization: Bearer <jwt>` signed with the shared secret,
so the monolith can verify it came from the video service.

---

## Database Schema

```
┌─────────────────────────────────────────────┐
│                   videos                     │
├──────────────┬───────────────┬──────────────┤
│ Column       │ Type          │ Notes        │
├──────────────┼───────────────┼──────────────┤
│ id           │ UUID (PK)     │ Auto-gen     │
│ originalName │ String        │ "lecture.mp4"│
│ mimeType     │ String        │ "video/mp4"  │
│ fileSize     │ BigInt        │ Bytes        │
│ status       │ VideoStatus   │ Enum (index) │
│ storageProvider│ StorageProvider│ local | s3  │
│ duration     │ Float?        │ Seconds      │
│ rawKey       │ String (uniq) │ S3 object key│
│ thumbnailKey │ String?       │ S3 object key│
│ hlsKey       │ String?       │ master.m3u8  │
│ resolutions  │ JSON?         │ {360p: ...}  │
│ errorMessage │ String?       │ On failure   │
│ callbackUrl  │ String?       │ Webhook URL  │
│ createdAt    │ DateTime      │ Auto         │
│ updatedAt    │ DateTime      │ Auto         │
│ processedAt  │ DateTime?     │ When READY   │
└──────────────┴───────────────┴──────────────┘

VideoStatus enum: UPLOADING → UPLOADED → PROCESSING → READY
                                                    ↘ FAILED

StorageProvider enum: local | s3
  - Recorded at upload time so the system knows where each video's files live.
  - listVideos filters by the active provider — switching STORAGE_PROVIDER
    hides videos whose files are in the other backend.
  - The stream proxy rejects requests for videos whose provider differs
    from the running server's STORAGE_PROVIDER.
```

---

## Video Lifecycle (State Machine)

```
                    ┌──────────┐
   Direct Upload    │UPLOADING │   Presigned URL flow
   ─────────────────►          │◄────────────────────
   (skips to        │          │   (waiting for PUT
    UPLOADED)       └────┬─────┘    to S3)
                         │
                    POST /:id/process
                    (or auto after direct upload)
                         │
                         ▼
                    ┌──────────┐
                    │UPLOADED  │
                    │          │
                    └────┬─────┘
                         │
                    BullMQ job picked up
                         │
                         ▼
                    ┌──────────┐
                    │PROCESSING│
                    │          │
                    └────┬─────┘
                         │
                ┌────────┴────────┐
                │                 │
           Success            Failure
                │                 │
                ▼                 ▼
          ┌──────────┐     ┌──────────┐
          │  READY   │     │  FAILED  │
          │          │     │          │
          └──────────┘     └──────────┘
```

---

## Configuration Reference

### `.env` — Video Service

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `NODE_ENV` | No | `development` | `development` or `production` |
| `PORT` | No | `4001` | API server port |
| `DATABASE_URL` | **Yes** | — | PostgreSQL connection string |
| `SERVICE_AUTH_SECRET` | **Yes** | — | Shared JWT secret (48+ bytes, base64url) |
| `SERVICE_BASE_URL` | No | `http://localhost:4001` | Public URL for stream proxy links |
| `STORAGE_PROVIDER` | No | `local` | `local` (MinIO) or `s3` (AWS S3) |
| `STORAGE_BUCKET_RAW` | No | `video-raw` | Bucket for raw uploads |
| `STORAGE_BUCKET_PROCESSED` | No | `video-processed` | Bucket for HLS output |
| `MINIO_ENDPOINT` | No | `localhost` | MinIO host (local only) |
| `MINIO_PORT` | No | `9000` | MinIO port (local only) |
| `MINIO_ACCESS_KEY` | No | `minioadmin` | MinIO key (local only) |
| `MINIO_SECRET_KEY` | No | `minioadmin` | MinIO secret (local only) |
| `MINIO_USE_SSL` | No | `false` | SSL for MinIO (local only) |
| `AWS_ACCESS_KEY_ID` | S3 only | — | AWS IAM access key |
| `AWS_SECRET_ACCESS_KEY` | S3 only | — | AWS IAM secret key |
| `AWS_REGION` | S3 only | `us-east-1` | AWS region |
| `CDN_URL` | No | — | CloudFront/CDN base URL |
| `REDIS_HOST` | No | `localhost` | Redis host |
| `REDIS_PORT` | No | `6379` | Redis port |
| `REDIS_PASSWORD` | No | — | Redis password |
| `FFMPEG_PATH` | No | `ffmpeg` | Absolute path to ffmpeg binary |
| `FFPROBE_PATH` | No | `ffprobe` | Absolute path to ffprobe binary |
| `MAX_CONCURRENT_JOBS` | No | `2` | Parallel transcode jobs |
| `TRANSCODE_RESOLUTIONS` | No | `360,480,720,1080` | Comma-separated resolutions |
| `DEFAULT_CALLBACK_URL` | No | `http://localhost:4000/api/webhooks/video` | Default webhook URL |

### `.env.local` — Example Client (Next.js)

| Variable | Description |
|----------|-------------|
| `SERVICE_AUTH_SECRET` | Must match the video service secret |
| `VIDEO_SERVICE_URL` | Video service API URL (default: `http://localhost:4001/api`) |

---

## Exposing with ngrok

[ngrok](https://ngrok.com) creates a public tunnel to your local service, useful for:
- Testing webhooks from external services
- Sharing a demo with teammates
- Mobile device testing
- Testing the full upload → transcode → stream pipeline from a remote device

### Setup

```bash
# Install ngrok
brew install ngrok   # macOS
# or download from https://ngrok.com/download

# Authenticate (one-time)
ngrok config add-authtoken <your-token>
```

### Expose the video service

```bash
# Tunnel to the Express API (port 4001)
ngrok http 4001
```

You'll get a public URL like:
```
https://a1b2c3d4e5f6.ngrok-free.app → http://localhost:4001
```

### Update configuration

After starting ngrok, update these to use the public URL:

**1. Video service `.env`:**

```bash
# So stream proxy URLs in API responses point to the ngrok URL
SERVICE_BASE_URL=https://a1b2c3d4e5f6.ngrok-free.app
```

**2. Example client `.env.local`:**

```bash
# Point the Next.js client at the ngrok URL
VIDEO_SERVICE_URL=https://a1b2c3d4e5f6.ngrok-free.app/api
```

**3. Restart both services** after changing env vars.

### Expose both services (video service + example client)

```bash
# Terminal 1: Video service
ngrok http 4001

# Terminal 2: Example client (Next.js on port 3001)
ngrok http 3001
```

### Testing webhooks with ngrok

If you want the monolith to receive webhooks from the video service:

```bash
# Expose the monolith
ngrok http 4000
```

Then set the callback URL when uploading:

```bash
curl -X POST https://<video-ngrok>.ngrok-free.app/api/videos/upload \
  -H "Authorization: Bearer <token>" \
  -F "video=@lecture.mp4" \
  -F "callbackUrl=https://<monolith-ngrok>.ngrok-free.app/api/webhooks/video"
```

### ngrok gotchas

- **Free tier**: URLs change every restart. Use `ngrok http 4001 --domain=your-domain.ngrok-free.app` with a reserved domain (free plan gets 1).
- **Request inspection**: Visit `http://localhost:4040` to see all requests through the tunnel.
- **Large uploads**: ngrok free tier may timeout on very large files. Increase with `--request-timeout 600` if needed.
- **CORS**: The video service already sets `Access-Control-Allow-Origin: *`, so ngrok URLs work out of the box.

---

## Production Deployment

### Recommended architecture

```
┌─────────────────────────────────────────────────────────┐
│                     AWS / Cloud                          │
│                                                          │
│  ┌──────────────────────┐  ┌──────────────────────────┐ │
│  │ ECS / EC2 / K8s      │  │ ECS / EC2 / K8s          │ │
│  │ ┌──────────────────┐ │  │ ┌────────────────────┐   │ │
│  │ │ Video Service    │ │  │ │ Transcode Worker   │   │ │
│  │ │ (API server)     │ │  │ │ (BullMQ consumer)  │   │ │
│  │ └──────────────────┘ │  │ └────────────────────┘   │ │
│  └──────────┬───────────┘  └──────────────────────────┘ │
│             │                                            │
│  ┌──────────▼───────────────────────────────────────┐   │
│  │ AWS RDS (PostgreSQL) │ ElastiCache (Redis)       │   │
│  └──────────────────────────────────────────────────┘   │
│                                                          │
│  ┌──────────────────────────────────────────────────┐   │
│  │ S3 Bucket ──► CloudFront (CDN)                   │   │
│  │ STORAGE_PROVIDER=s3                               │   │
│  │ CDN_URL=https://cdn.yourdomain.com                │   │
│  └──────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────┘
```

### Key production changes

| Setting | Development | Production |
|---------|------------|------------|
| `STORAGE_PROVIDER` | `local` | `s3` |
| `NODE_ENV` | `development` | `production` |
| `SERVICE_AUTH_SECRET` | Dev secret | Strong random secret |
| `SERVICE_BASE_URL` | `http://localhost:4001` | `https://video-api.yourdomain.com` |
| `CDN_URL` | (empty) | `https://cdn.yourdomain.com` |
| `FFMPEG_PATH` | `/opt/homebrew/bin/ffmpeg` | `/usr/bin/ffmpeg` (in Docker) |
| `DEFAULT_CALLBACK_URL` | `http://localhost:4000/...` | `https://api.yourdomain.com/...` |

---

## Troubleshooting

### Common issues

| Problem | Cause | Fix |
|---------|-------|-----|
| `ENOENT: ffmpeg` | FFmpeg not found | Set `FFMPEG_PATH` / `FFPROBE_PATH` in `.env` |
| `Body exceeded 1 MB limit` | Next.js proxy size limit | Upload directly to video service (not through Next.js proxy) |
| `Socket timeout` on upload | Large file buffered in memory | Already fixed: uses disk-based multer + `fPutObject` |
| `403 Forbidden` from S3 | Private bucket, no CORS | Stream proxy handles this; or set `CDN_URL` with CloudFront |
| `ERR_BLOCKED_BY_RESPONSE` | Helmet `Cross-Origin-Resource-Policy` | Already fixed: set to `cross-origin` |
| `Missing parameter name: *` | Express 5 route syntax | Use `{*paramName}` instead of `*` |
| `Invalid or expired service token` | JWT mismatch | Ensure `SERVICE_AUTH_SECRET` matches across all services |
| `0-byte file in MinIO` | Presigned URL PUT skipped | Use direct upload, or follow the 3-step presigned flow |

### Useful commands

```bash
# Check service health
curl http://localhost:4001/api/health | jq

# Generate a JWT token for testing
npx ts-node scripts/generate-token.ts

# View MinIO Console (local)
open http://localhost:9001

# View BullMQ jobs (connect to Redis)
redis-cli -p 6379 KEYS "bull:*"

# Check FFmpeg installation
which ffmpeg && ffmpeg -version

# Reset database
npx prisma db push --force-reset
```

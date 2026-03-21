# Learnova Video Service

Independent video processing microservice for the Learnova platform. Handles video upload, transcoding to HLS (adaptive bitrate), thumbnail generation, and streaming — all locally via Docker.

## Architecture

```
Client Browser                 Monolith (server/)               Video Service
     │                              │                                │
     │  1. Create lesson (video)    │                                │
     │ ───────────────────────────► │                                │
     │                              │  2. POST /api/videos/upload-url│
     │                              │ ──────────────────────────────►│
     │                              │  { videoId, uploadUrl }        │
     │                              │ ◄──────────────────────────────│
     │  3. PUT uploadUrl (direct)   │                                │
     │ ─────────────────────────────────────────────────────────────►│ MinIO
     │                              │                                │
     │                              │  4. POST /api/videos/:id/process
     │                              │ ──────────────────────────────►│
     │                              │                                │ ─► BullMQ ─► FFmpeg Worker
     │                              │                                │     │ transcode + HLS + thumb
     │                              │  5. Webhook: video.ready       │ ◄───┘
     │                              │ ◄──────────────────────────────│
     │                              │                                │
     │  6. Play video (HLS)         │                                │
     │ ─────────────────────────────────────────────────────────────►│ MinIO/CDN
```

## Prerequisites

- **Docker & Docker Compose** (for PostgreSQL, Redis, MinIO)
- **Node.js 20+** and **npm**
- **FFmpeg** installed locally (for running the worker outside Docker)
  - macOS: `brew install ffmpeg`
  - Ubuntu: `sudo apt install ffmpeg`

## Quick Start

### 1. Start Infrastructure

```bash
cd services/video-service
docker compose up -d
```

This starts:
- **PostgreSQL** on port `5433` (video metadata)
- **Redis** on port `6379` (BullMQ job queue)
- **MinIO** on port `9000` (API) / `9001` (console)

MinIO Console: http://localhost:9001 (login: `minioadmin` / `minioadmin`)

### 2. Configure Environment

```bash
cp .env.example .env
```

The defaults work out of the box with the Docker Compose setup.

### 3. Install Dependencies

```bash
npm install
```

### 4. Setup Database

```bash
npx prisma generate
npx prisma db push
```

### 5. Run the Service

Terminal 1 — API Server:
```bash
npm run dev
```

Terminal 2 — Transcode Worker:
```bash
npm run dev:worker
```

The API runs at http://localhost:4001

## API Endpoints

All video endpoints require service-to-service auth via `Authorization: Bearer <service-jwt>`.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/health` | Health check (no auth required) |
| POST | `/api/videos/upload-url` | Get a presigned upload URL |
| POST | `/api/videos/:videoId/process` | Trigger transcoding after upload |
| GET | `/api/videos/:videoId` | Get video metadata + stream URL |
| GET | `/api/videos` | List videos (paginated) |
| DELETE | `/api/videos/:videoId` | Delete video and all files |

### Example: Upload a Video

```bash
# 1. Generate a service token (from the monolith)
# The monolith signs a JWT with the shared SERVICE_AUTH_SECRET

# 2. Request upload URL
curl -X POST http://localhost:4001/api/videos/upload-url \
  -H "Authorization: Bearer <service-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "originalName": "lecture-01.mp4",
    "mimeType": "video/mp4",
    "fileSize": 104857600
  }'

# Response: { "videoId": "abc-123", "uploadUrl": "http://localhost:9000/...", "rawKey": "..." }

# 3. Upload file directly to MinIO
curl -X PUT "<uploadUrl>" --upload-file lecture-01.mp4

# 4. Trigger processing
curl -X POST http://localhost:4001/api/videos/abc-123/process \
  -H "Authorization: Bearer <service-token>" \
  -H "Content-Type: application/json" \
  -d '{}'
```

## Service-to-Service Auth

Both the monolith and video service share a `SERVICE_AUTH_SECRET`. The calling service generates a JWT:

```typescript
import jwt from 'jsonwebtoken';

const token = jwt.sign(
  { service: 'learnova-server' },
  process.env.SERVICE_AUTH_SECRET,
  { expiresIn: '5m' }
);

// Use in request: Authorization: Bearer <token>
```

## Processing Pipeline

1. **Upload** → Raw video stored in MinIO `video-raw` bucket
2. **Transcode** → FFmpeg creates HLS segments at 360p, 480p, 720p, 1080p
3. **Thumbnail** → Extracted at 10% of video duration
4. **Duration** → Extracted via ffprobe
5. **Master Playlist** → HLS master manifest for adaptive bitrate
6. **Webhook** → Notifies monolith with video metadata when ready

## Environment Variables

See [`.env.example`](.env.example) for all configuration options.

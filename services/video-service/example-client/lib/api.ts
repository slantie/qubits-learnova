const VIDEO_SERVICE_URL = process.env.VIDEO_SERVICE_URL || 'http://localhost:4001/api';
const SERVICE_SECRET = process.env.SERVICE_AUTH_SECRET!;

function generateToken(): string {
  // Simple base64url encoder
  const b64url = (str: string) =>
    Buffer.from(str).toString('base64url');

  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const payload = b64url(JSON.stringify({ service: 'example-client', iat: now, exp: now + 3600 }));

  const crypto = require('crypto');
  const signature = crypto
    .createHmac('sha256', SERVICE_SECRET)
    .update(`${header}.${payload}`)
    .digest('base64url');

  return `${header}.${payload}.${signature}`;
}

export async function getVideo(videoId: string) {
  const token = generateToken();
  const res = await fetch(`${VIDEO_SERVICE_URL}/videos/${videoId}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function listVideos() {
  const token = generateToken();
  const res = await fetch(`${VIDEO_SERVICE_URL}/videos?limit=50`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function deleteVideo(videoId: string) {
  const token = generateToken();
  const res = await fetch(`${VIDEO_SERVICE_URL}/videos/${videoId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

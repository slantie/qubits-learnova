import { NextResponse } from 'next/server';
import crypto from 'crypto';

const SERVICE_SECRET = process.env.SERVICE_AUTH_SECRET!;

function generateToken(): string {
  const b64url = (str: string) => Buffer.from(str).toString('base64url');

  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const now = Math.floor(Date.now() / 1000);
  const payload = b64url(
    JSON.stringify({ service: 'example-client', iat: now, exp: now + 3600 })
  );

  const signature = crypto
    .createHmac('sha256', SERVICE_SECRET)
    .update(`${header}.${payload}`)
    .digest('base64url');

  return `${header}.${payload}.${signature}`;
}

export async function GET() {
  return NextResponse.json({ token: generateToken() });
}

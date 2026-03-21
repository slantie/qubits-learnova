import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../config/env';

export interface ServiceTokenPayload {
  service: string;
  iat: number;
  exp: number;
}

/**
 * Validates service-to-service JWT tokens.
 * The calling service must send: Authorization: Bearer <service-jwt>
 * The JWT is signed with the shared SERVICE_AUTH_SECRET.
 */
export function serviceAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;

  if (!header || !header.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing or invalid Authorization header' });
    return;
  }

  const token = header.slice(7);

  try {
    const payload = jwt.verify(token, env.serviceAuthSecret) as ServiceTokenPayload;
    (req as any).servicePayload = payload;
    next();
  } catch {
    res.status(403).json({ error: 'Invalid or expired service token' });
  }
}

/**
 * Generates a service-to-service JWT for outbound calls (e.g., webhooks).
 */
export function generateServiceToken(serviceName = 'video-service'): string {
  const now = Math.floor(Date.now() / 1000);
  return jwt.sign({ service: serviceName, iat: now, exp: now + 300 }, env.serviceAuthSecret);
}

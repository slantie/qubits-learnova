import helmet from 'helmet';
import cors from 'cors';
import morgan from 'morgan';
import compression from 'compression';
import rateLimit from 'express-rate-limit';

export const helmetMiddleware = helmet();

export const corsMiddleware = cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
});

export const morganMiddleware = morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev');

export const compressionMiddleware = compression();

export const rateLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many requests, please try again later.' },
});

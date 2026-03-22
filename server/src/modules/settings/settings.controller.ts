import { Request, Response } from 'express';

export const getSettings = (_req: Request, res: Response): void => {
  const masked = (val: string | undefined) =>
    val ? `${val.slice(0, 4)}${'•'.repeat(Math.max(0, val.length - 4))}` : null;

  res.json({
    platform: {
      nodeEnv:   process.env.NODE_ENV ?? null,
      clientUrl: process.env.CLIENT_URL ?? null,
      port:      process.env.PORT ?? null,
    },
    database: {
      connected: !!process.env.DATABASE_URL,
      url:       process.env.DATABASE_URL ? masked(process.env.DATABASE_URL) : null,
    },
    smtp: {
      host:    process.env.SMTP_HOST ?? null,
      port:    process.env.SMTP_PORT ?? null,
      secure:  process.env.SMTP_SECURE ?? null,
      user:    process.env.SMTP_USER ?? null,
      from:    process.env.SMTP_FROM ?? null,
      hasPass: !!process.env.SMTP_PASS,
    },
    cloudinary: {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME ?? null,
      hasApiKey: !!process.env.CLOUDINARY_API_KEY,
      hasSecret: !!process.env.CLOUDINARY_API_SECRET,
    },
    payments: {
      razorpayKeyId:    process.env.RAZORPAY_KEY_ID ?? null,
      hasRazorpaySecret: !!process.env.RAZORPAY_KEY_SECRET,
    },
    auth: {
      jwtExpiresIn:        process.env.JWT_EXPIRES_IN ?? null,
      jwtRefreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN ?? null,
      bcryptRounds:        process.env.BCRYPT_SALT_ROUNDS ?? null,
      hasJwtSecret:        !!process.env.JWT_SECRET,
      hasRefreshSecret:    !!process.env.JWT_REFRESH_SECRET,
    },
    uploads: {
      maxFileSize: process.env.MAX_FILE_SIZE ?? null,
    },
    videoService: {
      url:         process.env.VIDEO_SERVICE_URL ?? null,
      hasAuthSecret: !!process.env.SERVICE_AUTH_SECRET,
    },
  });
};

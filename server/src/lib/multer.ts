import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { AppError } from '../config/AppError';

const MAX_SIZE = parseInt(process.env.MAX_FILE_SIZE || '5242880');

function createUploader(subDir: string, allowedMimes: string[]) {
  const dir = path.join(process.cwd(), process.env.UPLOAD_DIR || 'uploads', subDir);
  fs.mkdirSync(dir, { recursive: true });

  return multer({
    storage: multer.diskStorage({
      destination: (_req, _file, cb) => cb(null, dir),
      filename: (_req, file, cb) => {
        const ext = path.extname(file.originalname);
        cb(null, `${Date.now()}-${Math.round(Math.random() * 1e9)}${ext}`);
      },
    }),
    fileFilter: (_req, file, cb) => {
      if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
      } else {
        cb(new AppError(400, `File type '${file.mimetype}' is not allowed`, 'INVALID_FILE_TYPE'));
      }
    },
    limits: { fileSize: MAX_SIZE },
  });
}

export const uploadCover = createUploader('covers', [
  'image/jpeg',
  'image/png',
  'image/webp',
]);

export const uploadLessonFile = createUploader('lessons', [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
]);

export const uploadAttachment = createUploader('attachments', [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
]);


import multer from 'multer';
import { AppError } from '../config/AppError';

const MAX_SIZE = parseInt(process.env.MAX_FILE_SIZE || '10485760'); // 10 MB default

const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];

const DOCUMENT_MIMES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'text/plain',
  'text/csv',
];

const AUDIO_MIMES = [
  'audio/mpeg',
  'audio/mp3',
  'audio/wav',
  'audio/wave',
  'audio/ogg',
  'audio/mp4',
  'audio/aac',
  'audio/flac',
  'audio/webm',
];

function createUploader(allowedMimes: string[]) {
  return multer({
    storage: multer.memoryStorage(), // Buffer in memory → stream to Cloudinary
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

// Cover images (courses)
export const uploadCover = createUploader(IMAGE_MIMES);

// Lesson content files (images, docs, audio)
export const uploadLessonFile = createUploader([...IMAGE_MIMES, ...DOCUMENT_MIMES, ...AUDIO_MIMES]);

// Attachments (all supported types)
export const uploadAttachment = createUploader([...IMAGE_MIMES, ...DOCUMENT_MIMES, ...AUDIO_MIMES]);

// Avatar images
export const uploadAvatar = createUploader(IMAGE_MIMES);

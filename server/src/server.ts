import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import prisma from './lib/prisma';
import router from './routes';
import { notFound } from './middleware/notFound';
import { errorHandler } from './middleware/errorHandler';
import {
  helmetMiddleware,
  corsMiddleware,
  morganMiddleware,
  compressionMiddleware,
  rateLimiter,
} from './middleware/security';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

// Security & logging
app.use(helmetMiddleware);
app.use(corsMiddleware);
app.use(morganMiddleware);
app.use(compressionMiddleware);
app.use(rateLimiter);

// Body parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static file serving for uploads
const uploadDir = path.join(process.cwd(), process.env.UPLOAD_DIR || 'uploads');
app.use('/uploads', express.static(uploadDir));

// Routes
app.get('/', (_, res) => {
  res.json({ message: 'Server is running 🚀', status: 'ok', timestamp: new Date().toISOString() });
});
app.use('/api', router);

// 404 & error handlers
app.use(notFound);
app.use(errorHandler);

// Start server
const server = app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});

// Graceful shutdown
process.on('SIGINT', async () => {
  await prisma.$disconnect();
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export { app, prisma };

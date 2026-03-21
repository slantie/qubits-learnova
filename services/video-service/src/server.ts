import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import { env } from './config/env';
import { prisma } from './lib/prisma';
import { ensureBuckets } from './lib/minio';
import { errorHandler } from './middleware/errorHandler';
import routes from './routes';

const app = express();

app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());

app.use('/api', routes);

app.use(errorHandler);

async function bootstrap() {
  try {
    await prisma.$connect();
    console.log('[DB] Connected to PostgreSQL');

    await ensureBuckets();
    console.log(`[Storage] Buckets verified (${env.storage.provider})`);

    app.listen(env.port, () => {
      console.log(`[Video Service] Running on port ${env.port}`);
      console.log(`[Video Service] Health: http://localhost:${env.port}/api/health`);
    });
  } catch (err) {
    console.error('[Video Service] Failed to start:', err);
    process.exit(1);
  }
}

bootstrap();

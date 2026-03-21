import { Router } from 'express';
import multer from 'multer';
import os from 'os';
import path from 'path';
import { serviceAuth } from '../middleware/serviceAuth';
import * as videoController from '../controllers/video.controller';

const upload = multer({
  dest: path.join(os.tmpdir(), 'learnova-uploads'),
  limits: { fileSize: 5 * 1024 * 1024 * 1024 }, // 5 GB
});

const router = Router();

// All video routes require service-to-service auth
router.use(serviceAuth);

router.post('/upload', upload.single('video'), videoController.uploadVideo);
router.post('/upload-url', videoController.createUploadUrl);
router.post('/:videoId/process', videoController.processVideo);
router.get('/:videoId', videoController.getVideo);
router.delete('/:videoId', videoController.deleteVideo);
router.get('/', videoController.listVideos);

export default router;

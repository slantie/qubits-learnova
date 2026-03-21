import { Router } from 'express';
import { authenticate } from '../../middleware/authenticate';
import * as ctrl from './certificate.controller';

const router = Router();

router.get('/templates', ctrl.listTemplates);
router.get('/templates/:templateKey/preview', ctrl.previewTemplate);

router.get('/my', authenticate, ctrl.listMine);
router.get('/course/:courseId', authenticate, ctrl.getMine);
router.post('/course/:courseId/issue', authenticate, ctrl.issue);

router.get('/view/:uid', ctrl.renderHtml);
router.get('/verify/:uid', ctrl.verify);

export default router;

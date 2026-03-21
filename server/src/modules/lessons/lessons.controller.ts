import { Request, Response, NextFunction } from 'express';
import * as lessonsService from './lessons.service';
import { AppError } from '../../config/AppError';
import { uploadToCloudinary } from '../../lib/cloudinary';

const courseId = (req: Request) => Number(req.params.courseId);
const lessonId = (req: Request) => Number(req.params.lessonId);

export const list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lessons = await lessonsService.listLessons(courseId(req), req.user.id, req.user.role);
    res.json({ lessons });
  } catch (err) { next(err); }
};

export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lesson = await lessonsService.createLesson(courseId(req), req.body, req.user.id, req.user.role);
    res.status(201).json(lesson);
  } catch (err) { next(err); }
};

export const reorder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await lessonsService.reorderLessons(courseId(req), req.body, req.user.id, req.user.role);
    res.status(204).send();
  } catch (err) { next(err); }
};

export const getOne = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lesson = await lessonsService.getLesson(courseId(req), lessonId(req), req.user.id, req.user.role);
    res.json(lesson);
  } catch (err) { next(err); }
};

export const update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lesson = await lessonsService.updateLesson(courseId(req), lessonId(req), req.body, req.user.id, req.user.role);
    res.json(lesson);
  } catch (err) { next(err); }
};

export const remove = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await lessonsService.deleteLesson(courseId(req), lessonId(req), req.user.id, req.user.role);
    res.status(204).send();
  } catch (err) { next(err); }
};

export const uploadFile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      next(new AppError(400, 'No file uploaded', 'NO_FILE'));
      return;
    }
    const { url } = await uploadToCloudinary(req.file.buffer, 'lessons', {
      resourceType: 'auto',
      filename: req.file.originalname,
    });
    const result = await lessonsService.uploadLessonFile(courseId(req), lessonId(req), url, req.user.id, req.user.role);
    res.json(result);
  } catch (err) { next(err); }
};

// ─── Attachments ──────────────────────────────────────────────────────────────

export const listAttachments = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const attachments = await lessonsService.listAttachments(courseId(req), lessonId(req), req.user.id, req.user.role);
    res.json({ attachments });
  } catch (err) { next(err); }
};

export const addAttachment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Multipart = file attachment; JSON = link attachment
    if (req.file) {
      const label = (req.body.label as string) || req.file.originalname;
      const { url } = await uploadToCloudinary(req.file.buffer, 'attachments', {
        resourceType: 'auto',
        filename: req.file.originalname,
      });
      const attachment = await lessonsService.addFileAttachment(courseId(req), lessonId(req), url, label, req.user.id, req.user.role);
      res.status(201).json(attachment);
    } else {
      const attachment = await lessonsService.addLinkAttachment(courseId(req), lessonId(req), req.body, req.user.id, req.user.role);
      res.status(201).json(attachment);
    }
  } catch (err) { next(err); }
};

export const deleteAttachment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await lessonsService.deleteAttachment(courseId(req), lessonId(req), Number(req.params.attachmentId), req.user.id, req.user.role);
    res.status(204).send();
  } catch (err) { next(err); }
};

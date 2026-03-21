import { Request, Response, NextFunction } from 'express';
import * as coursesService from './courses.service';
import { AppError } from '../../config/AppError';
import { uploadToCloudinary } from '../../lib/cloudinary';

export const list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const courses = await coursesService.listCourses(
      req.user.id,
      req.user.role,
      req.query.search as string | undefined,
    );
    res.json({ courses });
  } catch (err) { next(err); }
};

export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const course = await coursesService.createCourse(req.body, req.user.id);
    res.status(201).json(course);
  } catch (err) { next(err); }
};

export const remove = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await coursesService.deleteCourse(Number(req.params.id), req.user.id, req.user.role);
    res.status(204).send();
  } catch (err) { next(err); }
};

export const shareLink = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await coursesService.getShareLink(
      Number(req.params.id), req.user.id, req.user.role,
    );
    res.json(result);
  } catch (err) { next(err); }
};

export const getDetail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const course = await coursesService.getCourseDetail(
      Number(req.params.id), req.user.id, req.user.role,
    );
    res.json(course);
  } catch (err) { next(err); }
};

export const update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const course = await coursesService.updateCourse(
      Number(req.params.id), req.body, req.user.id, req.user.role,
    );
    res.json(course);
  } catch (err) { next(err); }
};

export const publish = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await coursesService.publishCourse(
      Number(req.params.id), req.body, req.user.id, req.user.role,
    );
    res.json(result);
  } catch (err) { next(err); }
};

export const uploadCoverImage = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.file) {
      next(new AppError(400, 'No file uploaded', 'NO_FILE'));
      return;
    }
    const { url } = await uploadToCloudinary(req.file.buffer, 'covers', {
      resourceType: 'image',
      filename: req.file.originalname,
    });
    const result = await coursesService.updateCoverImage(
      Number(req.params.id), url, req.user.id, req.user.role,
    );
    res.json(result);
  } catch (err) { next(err); }
};

// ─── Learner-facing ───────────────────────────────────────────────────────────

export const listPublic = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const search = req.query.search as string | undefined;
    const courses = await coursesService.listPublicCourses(search);
    res.json({ courses });
  } catch (err) { next(err); }
};

export const getView = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const course = await coursesService.getCourseView(Number(req.params.id), req.user.id, req.user.role);
    res.json(course);
  } catch (err) { next(err); }
};

export const getLessonView = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const lesson = await coursesService.getLessonView(
      Number(req.params.id),
      Number(req.params.lessonId),
      req.user.id,
      req.user.role,
    );
    res.json(lesson);
  } catch (err) { next(err); }
};

export const markLessonComplete = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await coursesService.markLessonComplete(
      Number(req.params.id),
      Number(req.params.lessonId),
      req.user.id,
    );
    res.json(result);
  } catch (err) { next(err); }
};

export const markLessonIncomplete = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await coursesService.markLessonIncomplete(
      Number(req.params.id),
      Number(req.params.lessonId),
      req.user.id,
    );
    res.json(result);
  } catch (err) { next(err); }
};

export const addAttendees = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await coursesService.addAttendees(
      Number(req.params.id), req.body, req.user.id, req.user.role,
    );
    res.json(result);
  } catch (err) { next(err); }
};

export const contactAttendees = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await coursesService.contactAttendees(
      Number(req.params.id), req.body, req.user.id, req.user.role,
    );
    res.json(result);
  } catch (err) { next(err); }
};

import { Request, Response, NextFunction } from 'express';
import * as learnerService from './learner.service';

// ─── Course Discovery ─────────────────────────────────────────────────────────

export const listCourses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const courses = await learnerService.listPublishedCourses(userId);
    res.json({ courses });
  } catch (err) { next(err); }
};

export const getCourseDetail = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const userId = req.user?.id;
    const course = await learnerService.getCourseDetail(Number(req.params.courseId), userId);
    res.json(course);
  } catch (err) { next(err); }
};

// ─── Enrollment ───────────────────────────────────────────────────────────────

export const enroll = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const enrollment = await learnerService.enrollInCourse(req.user.id, Number(req.params.courseId));
    res.status(201).json(enrollment);
  } catch (err) { next(err); }
};

export const myCourses = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const courses = await learnerService.getMyCoursesWithProgress(req.user.id);
    res.json({ courses });
  } catch (err) { next(err); }
};

// ─── Lesson Progress ──────────────────────────────────────────────────────────

export const markLessonComplete = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await learnerService.markLessonComplete(
      req.user.id,
      Number(req.params.courseId),
      Number(req.params.lessonId),
    );
    res.json(result);
  } catch (err) { next(err); }
};

export const getCourseProgress = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const progress = await learnerService.getCourseProgress(req.user.id, Number(req.params.courseId));
    res.json(progress);
  } catch (err) { next(err); }
};

// ─── Reviews ──────────────────────────────────────────────────────────────────

export const getReviews = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await learnerService.getCourseReviews(Number(req.params.courseId));
    res.json(result);
  } catch (err) { next(err); }
};

export const submitReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const review = await learnerService.submitReview(req.user.id, Number(req.params.courseId), req.body);
    res.status(201).json(review);
  } catch (err) { next(err); }
};

export const updateReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const review = await learnerService.updateReview(req.user.id, Number(req.params.courseId), req.body);
    res.json(review);
  } catch (err) { next(err); }
};

export const deleteReview = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await learnerService.deleteReview(req.user.id, Number(req.params.courseId));
    res.status(204).send();
  } catch (err) { next(err); }
};

// ─── Profile ──────────────────────────────────────────────────────────────────

export const getProfile = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const profile = await learnerService.getProfile(req.user.id);
    res.json(profile);
  } catch (err) { next(err); }
};

// ─── Payment ──────────────────────────────────────────────────────────────────

export const mockPayment = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await learnerService.mockPayment(req.user.id, Number(req.params.courseId));
    res.json(result);
  } catch (err) { next(err); }
};

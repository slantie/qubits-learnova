import { Request, Response, NextFunction } from 'express';
import * as reportingService from './reporting.service';

export const getSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const courseId = Number(req.query.courseId) || undefined;
    const result = await reportingService.getSummary(req.user.id, req.user.role, courseId);
    res.json(result);
  } catch (err) { next(err); }
};

export const getTable = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const courseId = Number(req.query.courseId) || undefined;
    const status = (req.query.status as string) || undefined;
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 20;
    const result = await reportingService.getTable(req.user.id, req.user.role, {
      courseId,
      status,
      page,
      limit,
    });
    res.json(result);
  } catch (err) { next(err); }
};

export const getCourseCards = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const courses = await reportingService.getCourseCards(req.user.id, req.user.role);
    res.json({ courses });
  } catch (err) { next(err); }
};

import { Request, Response, NextFunction } from 'express';
import * as svc from './sections.service';

export const list = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const courseId = Number(req.params.courseId);
    const sections = await svc.listSections(courseId, req.user!.id, req.user!.role);
    res.json({ sections });
  } catch (err) { next(err); }
};

export const create = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const courseId = Number(req.params.courseId);
    const section = await svc.createSection(courseId, req.body, req.user!.id, req.user!.role);
    res.status(201).json({ section });
  } catch (err) { next(err); }
};

export const update = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const courseId = Number(req.params.courseId);
    const sectionId = Number(req.params.sectionId);
    const section = await svc.updateSection(courseId, sectionId, req.body, req.user!.id, req.user!.role);
    res.json({ section });
  } catch (err) { next(err); }
};

export const remove = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const courseId = Number(req.params.courseId);
    const sectionId = Number(req.params.sectionId);
    await svc.deleteSection(courseId, sectionId, req.user!.id, req.user!.role);
    res.json({ ok: true });
  } catch (err) { next(err); }
};

export const reorder = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const courseId = Number(req.params.courseId);
    await svc.reorderSections(courseId, req.body, req.user!.id, req.user!.role);
    res.json({ ok: true });
  } catch (err) { next(err); }
};

export const moveLesson = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const courseId = Number(req.params.courseId);
    const { lessonId, sectionId, order } = req.body;
    const lesson = await svc.moveLessonToSection(
      courseId, Number(lessonId), sectionId ?? null, Number(order ?? 1),
      req.user!.id, req.user!.role,
    );
    res.json({ lesson });
  } catch (err) { next(err); }
};

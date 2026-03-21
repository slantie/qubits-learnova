import { Request, Response, NextFunction } from 'express';
import * as quizService from './quiz.service';

const courseId = (req: Request) => Number(req.params.courseId);
const quizId   = (req: Request) => Number(req.params.quizId);
const qId      = (req: Request) => Number(req.params.questionId);

export const listQuizzes = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const quizzes = await quizService.listQuizzes(courseId(req), req.user.id, req.user.role);
    res.json({ quizzes });
  } catch (err) { next(err); }
};

export const createQuiz = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const quiz = await quizService.createQuiz(courseId(req), req.body, req.user.id, req.user.role);
    res.status(201).json(quiz);
  } catch (err) { next(err); }
};

export const getQuiz = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const quiz = await quizService.getQuiz(courseId(req), quizId(req), req.user.id, req.user.role);
    res.json(quiz);
  } catch (err) { next(err); }
};

export const updateQuiz = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const quiz = await quizService.updateQuiz(
      courseId(req), quizId(req), req.body, req.user.id, req.user.role,
    );
    res.json(quiz);
  } catch (err) { next(err); }
};

export const deleteQuiz = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await quizService.deleteQuiz(courseId(req), quizId(req), req.user.id, req.user.role);
    res.status(204).send();
  } catch (err) { next(err); }
};

export const addQuestion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const question = await quizService.addQuestion(
      courseId(req), quizId(req), req.body, req.user.id, req.user.role,
    );
    res.status(201).json(question);
  } catch (err) { next(err); }
};

export const updateQuestion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const question = await quizService.updateQuestion(
      courseId(req), quizId(req), qId(req), req.body, req.user.id, req.user.role,
    );
    res.json(question);
  } catch (err) { next(err); }
};

export const deleteQuestion = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await quizService.deleteQuestion(
      courseId(req), quizId(req), qId(req), req.user.id, req.user.role,
    );
    res.status(204).send();
  } catch (err) { next(err); }
};

export const reorderQuestions = async (req: Request, res: Response, next: NextFunction) => {
  try {
    await quizService.reorderQuestions(
      courseId(req), quizId(req), req.body, req.user.id, req.user.role,
    );
    res.status(204).send();
  } catch (err) { next(err); }
};

export const upsertReward = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const reward = await quizService.upsertReward(
      courseId(req), quizId(req), req.body, req.user.id, req.user.role,
    );
    res.json(reward);
  } catch (err) { next(err); }
};

export const submitAttempt = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await quizService.submitAttempt(
      courseId(req), quizId(req), req.body, req.user.id,
    );
    res.status(201).json(result);
  } catch (err) { next(err); }
};

export const getMyAttempts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const attempts = await quizService.getMyAttempts(
      courseId(req), quizId(req), req.user.id,
    );
    res.json({ attempts });
  } catch (err) { next(err); }
};

export const getQuizAttempts = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const attempts = await quizService.getQuizAttempts(
      courseId(req), quizId(req), req.user.id, req.user.role,
    );
    res.json({ attempts });
  } catch (err) { next(err); }
};

export const getQuizAnalytics = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const analytics = await quizService.getQuizAnalytics(
      courseId(req), quizId(req), req.user.id, req.user.role,
    );
    res.json(analytics);
  } catch (err) { next(err); }
};

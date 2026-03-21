import { Request, Response, NextFunction } from 'express';
import * as authService from './auth.service';

export const signup = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await authService.signup(req.body);
    res.status(201).json(result);
  } catch (err) {
    next(err);
  }
};

export const login = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const result = await authService.login(req.body);
    res.json(result);
  } catch (err) {
    next(err);
  }
};

export const me = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const user = await authService.getMe(req.user.id);
    res.json({ user });
  } catch (err) {
    next(err);
  }
};

export const logout = (_req: Request, res: Response) => {
  // Stateless JWT — client drops the token
  res.json({ message: 'Logged out' });
};

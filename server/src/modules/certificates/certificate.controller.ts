import { Request, Response, NextFunction } from 'express';
import * as certService from './certificate.service';

export const listTemplates = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    res.json({ templates: certService.listTemplates() });
  } catch (err) { next(err); }
};

export const previewTemplate = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const html = certService.previewTemplate(req.params.templateKey as string);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (err) { next(err); }
};

export const issue = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cert = await certService.issueCertificate(
      req.user.id,
      Number(req.params.courseId),
      (req.body.templateKey as string) || 'classic-gold',
    );
    res.status(201).json({ certificate: cert });
  } catch (err) { next(err); }
};

export const getMine = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const cert = await certService.getMyCertificate(req.user.id, Number(req.params.courseId));
    res.json({ certificate: cert });
  } catch (err) { next(err); }
};

export const renderHtml = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const html = await certService.renderCertificateHtml(req.params.uid as string);
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (err) { next(err); }
};

export const verify = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const accept = req.headers.accept ?? '';
    if (accept.includes('text/html') && !accept.includes('application/json')) {
      const html = await certService.renderVerifyPage(req.params.uid as string);
      res.setHeader('Content-Type', 'text/html');
      res.send(html);
      return;
    }
    const result = await certService.verifyCertificate(req.params.uid as string);
    res.json(result);
  } catch (err) { next(err); }
};

export const listMine = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const certificates = await certService.listMyCertificates(req.user.id);
    res.json({ certificates });
  } catch (err) { next(err); }
};

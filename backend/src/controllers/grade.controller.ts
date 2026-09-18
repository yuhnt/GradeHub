import type { Request, Response } from 'express';
import { gradeService } from '../services/grade.service';
import { currentUserId } from '../middleware/auth.middleware';
import { parseId } from '../utils/params';

export const gradeController = {
  async grade(req: Request, res: Response) {
    const result = await gradeService.grade(parseId(req.params.id), currentUserId(req), req.body);
    res.status(200).json(result);
  },

  async getGrade(req: Request, res: Response) {
    const result = await gradeService.getGrade(parseId(req.params.id), req.user!);
    res.status(200).json(result);
  },
};

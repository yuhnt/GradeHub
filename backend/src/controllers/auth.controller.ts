import type { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { currentUserId } from '../middleware/auth.middleware';

export const authController = {
  async register(req: Request, res: Response) {
    const user = await authService.register(req.body);
    res.status(201).json(user);
  },

  async login(req: Request, res: Response) {
    const result = await authService.login(req.body);
    res.status(200).json(result);
  },

  // Per the locked-in decision: purely client-side token discard.
  // This endpoint exists for API symmetry/documentation only.
  logout(_req: Request, res: Response) {
    res.status(200).json({ msg: 'logged out' });
  },

  async me(req: Request, res: Response) {
    const user = await authService.me(currentUserId(req));
    res.status(200).json(user);
  },

  async forgotPassword(req: Request, res: Response) {
    const result = await authService.forgotPassword(req.body);
    res.status(200).json(result);
  },

  async resetPassword(req: Request, res: Response) {
    const result = await authService.resetPassword(req.body);
    res.status(200).json(result);
  },
};

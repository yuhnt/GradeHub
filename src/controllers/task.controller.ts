import type { Request, Response } from 'express';
import { taskService } from '../services/task.service';
import { currentUserId } from '../middleware/auth.middleware';
import { ApiError } from '../middleware/error.middleware';
import { parseId } from '../utils/params';
import { listTasksQuerySchema } from '../validators/task.validator';

export const taskController = {
  async create(req: Request, res: Response) {
    const task = await taskService.create(req.body, currentUserId(req));
    res.status(201).json(task);
  },

  async list(req: Request, res: Response) {
    const parsed = listTasksQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      throw new ApiError(400, parsed.error.issues[0]?.message ?? 'invalid query');
    }
    const result = await taskService.list(parsed.data);
    res.status(200).json(result);
  },

  async getById(req: Request, res: Response) {
    const task = await taskService.getById(parseId(req.params.id));
    res.status(200).json(task);
  },

  async update(req: Request, res: Response) {
    const task = await taskService.update(parseId(req.params.id), req.body, currentUserId(req));
    res.status(200).json(task);
  },

  async delete(req: Request, res: Response) {
    const result = await taskService.delete(parseId(req.params.id), currentUserId(req));
    res.status(200).json(result);
  },

  async listSubmissions(req: Request, res: Response) {
    const result = await taskService.listSubmissions(parseId(req.params.id), currentUserId(req));
    res.status(200).json(result);
  },

  // The route validates :id before uploadPdf, and uploadPdf guarantees req.file.
  async createTestSubmission(req: Request, res: Response) {
    const submission = await taskService.createTestSubmission(
      parseId(req.params.id),
      currentUserId(req),
      req.file!.path
    );
    res.status(201).json(submission);
  },
};

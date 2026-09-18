import path from 'path';
import type { Request, Response } from 'express';
import { submissionService } from '../services/submission.service';
import { currentUserId } from '../middleware/auth.middleware';
import { ApiError } from '../middleware/error.middleware';
import { createSubmissionSchema } from '../validators/submission.validator';
import { parseId } from '../utils/params';
import { removeFile } from '../utils/files';

export const submissionController = {
  // multipart/form-data: the body is only parsed once multer has run, so
  // taskId is validated here instead of with validateBody().
  async create(req: Request, res: Response) {
    const filePath = req.file!.path;

    const parsed = createSubmissionSchema.safeParse(req.body);
    if (!parsed.success) {
      await removeFile(filePath);
      throw new ApiError(400, parsed.error.issues[0]?.message ?? 'invalid request body');
    }

    const submission = await submissionService.create(currentUserId(req), parsed.data.taskId, filePath);
    res.status(201).json(submission);
  },

  async delete(req: Request, res: Response) {
    const result = await submissionService.delete(parseId(req.params.id), currentUserId(req));
    res.status(200).json(result);
  },

  async getById(req: Request, res: Response) {
    const submission = await submissionService.getById(parseId(req.params.id), req.user!);
    res.status(200).json(submission);
  },

  async downloadFile(req: Request, res: Response) {
    const filePath = await submissionService.getFilePath(parseId(req.params.id), req.user!);
    res.type('application/pdf').sendFile(path.resolve(filePath), (err) => {
      if (err && !res.headersSent) {
        res.status(404).json({ error: 'file not found' });
      }
    });
  },
};

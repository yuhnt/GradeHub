import { z } from 'zod';
import { missingOr } from './messages';

// multipart/form-data fields arrive as strings, so taskId is validated
// as a string of digits and converted to a bigint.
export const createSubmissionSchema = z.object({
  taskId: z
    .string({ error: missingOr('taskId missing', 'taskId must be a number') })
    .trim()
    .min(1, 'taskId missing')
    .regex(/^\d+$/, 'taskId must be a number')
    .transform((value) => BigInt(value)),
});

export type CreateSubmissionInput = z.infer<typeof createSubmissionSchema>;

// GET /api/submissions/mine?taskId=12 - taskId is optional.
export const listMySubmissionsQuerySchema = z.object({
  taskId: z
    .string({ error: 'taskId must be a number' })
    .regex(/^\d+$/, 'taskId must be a number')
    .transform((value) => BigInt(value))
    .optional(),
});

export type ListMySubmissionsQuery = z.infer<typeof listMySubmissionsQuerySchema>;

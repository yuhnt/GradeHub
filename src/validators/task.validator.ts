import { z } from 'zod';

const MISSING = 'title, description missing';
const TOO_LONG = 'title, description too long';
const BAD_DEADLINE = 'invalid deadline: deadline must later than now';

// PUT replaces the whole task, so create and update share one schema:
// title, description and deadline are all required either way.
export const taskBodySchema = z.object({
  title: z
    .string({ required_error: MISSING, invalid_type_error: MISSING })
    .trim()
    .min(1, MISSING)
    .max(150, TOO_LONG),
  description: z
    .string({ required_error: MISSING, invalid_type_error: MISSING })
    .trim()
    .min(1, MISSING)
    .max(1000, TOO_LONG),
  deadline: z
    .string({ required_error: 'deadline missing', invalid_type_error: 'invalid deadline format' })
    .datetime({ offset: true, message: 'invalid deadline format' })
    .transform((value) => new Date(value))
    .refine((date) => date.getTime() > Date.now(), BAD_DEADLINE),
});

export const createTaskSchema = taskBodySchema;
export const updateTaskSchema = taskBodySchema;

export type TaskInput = z.infer<typeof taskBodySchema>;

// GET /api/tasks?page=1&limit=20 - query values arrive as strings.
export const listTasksQuerySchema = z.object({
  page: z.coerce
    .number({ invalid_type_error: 'page must be a positive integer' })
    .int('page must be a positive integer')
    .min(1, 'page must be a positive integer')
    .default(1),
  limit: z.coerce
    .number({ invalid_type_error: 'limit must be an integer between 1 and 100' })
    .int('limit must be an integer between 1 and 100')
    .min(1, 'limit must be an integer between 1 and 100')
    .max(100, 'limit must be an integer between 1 and 100')
    .default(20),
});

export type ListTasksQuery = z.infer<typeof listTasksQuerySchema>;

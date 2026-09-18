import { z } from 'zod';

// multipart/form-data fields arrive as strings, so taskId is validated
// as a string of digits and converted to a bigint.
export const createSubmissionSchema = z.object({
  taskId: z
    .string({ required_error: 'taskId missing', invalid_type_error: 'taskId must be a number' })
    .trim()
    .min(1, 'taskId missing')
    .regex(/^\d+$/, 'taskId must be a number')
    .transform((value) => BigInt(value)),
});

export type CreateSubmissionInput = z.infer<typeof createSubmissionSchema>;

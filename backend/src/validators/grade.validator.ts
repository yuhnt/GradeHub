import { z } from 'zod';

const GRADE_TYPE = 'grade is required and must be an integer';
const GRADE_RANGE = 'grade must be between 0 and 100';

export const gradeSchema = z.object({
  grade: z
    // Missing, not a number (strings, NaN) and non-integers all get the same message.
    .number({ error: GRADE_TYPE })
    .int(GRADE_TYPE)
    .min(0, GRADE_RANGE)
    .max(100, GRADE_RANGE),
  feedback: z.string({ error: 'feedback must be a string' }).max(5000).nullable().optional(),
});

export type GradeInput = z.infer<typeof gradeSchema>;

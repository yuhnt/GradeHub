import { z } from 'zod';

// Same limits as backend/src/validators/task.validator.ts.
export const TITLE_MAX = 150;
export const DESCRIPTION_MAX = 1000;

export const taskFormSchema = z.object({
  title: z
    .string()
    .trim()
    .min(1, 'Enter a title.')
    .max(TITLE_MAX, `Keep the title under ${TITLE_MAX} characters.`),
  description: z
    .string()
    .trim()
    .min(1, 'Enter a description.')
    .max(DESCRIPTION_MAX, `Keep the description under ${DESCRIPTION_MAX} characters.`),
  /** Value of <input type="datetime-local">, in the teacher's local time. */
  deadline: z
    .string()
    .min(1, 'Choose a deadline.')
    .refine((value) => !Number.isNaN(new Date(value).getTime()), 'Enter a valid date and time.')
    .refine((value) => new Date(value).getTime() > Date.now(), 'The deadline must be in the future.'),
});

export type TaskFormValues = z.infer<typeof taskFormSchema>;

import { z } from 'zod';

// Same limits as backend/src/validators/auth.validator.ts, checked here so
// users see the problem before a round trip.

const password = z
  .string()
  .min(8, 'Use at least 8 characters.')
  .max(100, 'Use at most 100 characters.');

export const loginSchema = z.object({
  username: z.string().trim().min(1, 'Enter your username.'),
  password: z.string().min(1, 'Enter your password.'),
});

export const registerSchema = z
  .object({
    username: z
      .string()
      .trim()
      .min(3, 'Use at least 3 characters.')
      .max(50, 'Use at most 50 characters.'),
    email: z.string().trim().pipe(z.email('Enter a valid email address.')),
    password,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    path: ['confirmPassword'],
    message: "The passwords don't match.",
  });

export const forgotPasswordSchema = z.object({
  email: z.string().trim().pipe(z.email('Enter a valid email address.')),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().trim().min(1, 'Paste the reset code from the email.'),
    newPassword: password,
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    path: ['confirmPassword'],
    message: "The passwords don't match.",
  });

export type LoginValues = z.infer<typeof loginSchema>;
export type RegisterValues = z.infer<typeof registerSchema>;
export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

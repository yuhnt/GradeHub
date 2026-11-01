import { z } from 'zod';

// zod 4's default is "Invalid email address"; docs/api.md promises this text.
const email = () => z.email('Invalid email');

export const registerSchema = z.object({
  username: z.string().min(3).max(50),
  email: email(),
  password: z.string().min(8).max(100),
  // Deliberately no "role" field: public registration always creates
  // a student account. If the client sends one, it's ignored by the
  // controller, not validated here.
});

export const loginSchema = z.object({
  username: z.string().min(1),
  password: z.string().min(1),
});

export const forgotPasswordSchema = z.object({
  email: email(),
});

export const resetPasswordSchema = z.object({
  token: z.string().min(1),
  newPassword: z.string().min(8).max(100),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;

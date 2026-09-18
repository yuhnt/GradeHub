import dotenv from 'dotenv';

dotenv.config();

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

export const env = {
  databaseUrl: required('DATABASE_URL'),
  jwtSecret: required('JWT_SECRET'),
  jwtExpiresIn: process.env.JWT_EXPIRES_IN ?? '1d',
  bcryptSaltRounds: Number(process.env.BCRYPT_SALT_ROUNDS ?? 10),
  port: Number(process.env.PORT ?? 3000),
  uploadDir: process.env.UPLOAD_DIR ?? 'uploads',
  resetTokenExpiryMinutes: Number(process.env.RESET_TOKEN_EXPIRY_MINUTES ?? 30),
  // Email over SMTP (Gmail, Brevo, Mailgun, ...). Optional: without
  // SMTP_HOST, reset emails are logged to the console instead of sent.
  // SMTP_HOST="ethereal" uses a throwaway Ethereal inbox (no signup).
  smtpHost: process.env.SMTP_HOST ?? '',
  smtpPort: Number(process.env.SMTP_PORT ?? 587),
  smtpUser: process.env.SMTP_USER ?? '',
  smtpPass: process.env.SMTP_PASS ?? '',
  mailFrom: process.env.MAIL_FROM ?? process.env.SMTP_USER ?? '',
  // Frontend page that reads ?token=... and calls POST /api/auth/reset-password.
  // Optional: without it, the email contains just the raw token.
  resetPasswordUrl: process.env.RESET_PASSWORD_URL ?? '',
};

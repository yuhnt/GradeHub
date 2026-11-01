import nodemailer, { type Transporter } from 'nodemailer';
import { env } from '../config/env';

type Mode = 'console' | 'ethereal' | 'smtp';

const mode: Mode = !env.smtpHost ? 'console' : env.smtpHost === 'ethereal' ? 'ethereal' : 'smtp';

let transporterPromise: Promise<Transporter> | null = null;

// Created lazily on the first email, so the server starts even if the SMTP
// server is unreachable, and the Ethereal account is only made when needed.
function getTransporter(): Promise<Transporter> {
  if (!transporterPromise) {
    transporterPromise = (async () => {
      if (mode === 'ethereal') {
        const account = await nodemailer.createTestAccount();
        console.log(`[email] using Ethereal test inbox ${account.user}`);
        return nodemailer.createTransport({
          host: account.smtp.host,
          port: account.smtp.port,
          secure: account.smtp.secure,
          auth: { user: account.user, pass: account.pass },
        });
      }
      return nodemailer.createTransport({
        host: env.smtpHost,
        port: env.smtpPort,
        secure: env.smtpPort === 465, // 465 = implicit TLS; 587 upgrades with STARTTLS
        auth: env.smtpUser ? { user: env.smtpUser, pass: env.smtpPass } : undefined,
      });
    })();
    // Let a failed setup be retried on the next email.
    transporterPromise.catch(() => {
      transporterPromise = null;
    });
  }
  return transporterPromise;
}

function buildResetEmail(rawToken: string) {
  const minutes = env.resetTokenExpiryMinutes;

  if (env.resetPasswordUrl) {
    const link = `${env.resetPasswordUrl}?token=${encodeURIComponent(rawToken)}`;
    return {
      subject: 'Reset your Task Grading Hub password',
      text: `Someone asked to reset your password. Open this link to choose a new one:\n\n${link}\n\nThe link expires in ${minutes} minutes. If you didn't ask for this, ignore this email.`,
      html: `<p>Someone asked to reset your password.</p><p><a href="${link}">Choose a new password</a></p><p>The link expires in ${minutes} minutes. If you didn't ask for this, ignore this email.</p>`,
    };
  }

  return {
    subject: 'Your Task Grading Hub password reset code',
    text: `Someone asked to reset your password. Use this reset token:\n\n${rawToken}\n\nIt expires in ${minutes} minutes. If you didn't ask for this, ignore this email.`,
    html: `<p>Someone asked to reset your password. Use this reset token:</p><p><code>${rawToken}</code></p><p>It expires in ${minutes} minutes. If you didn't ask for this, ignore this email.</p>`,
  };
}

export const emailService = {
  async sendPasswordReset(to: string, rawToken: string) {
    if (mode === 'console') {
      console.log(`[dev] password reset token for ${to}: ${rawToken}`);
      return;
    }

    const transporter = await getTransporter();
    const info = await transporter.sendMail({
      from: env.mailFrom || 'Task Grading Hub <no-reply@example.com>',
      to,
      ...buildResetEmail(rawToken),
    });

    if (mode === 'ethereal') {
      console.log(`[email] reset email for ${to}: ${nodemailer.getTestMessageUrl(info)}`);
    }
  },
};

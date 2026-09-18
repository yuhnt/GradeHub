import { userRepository } from '../repositories/user.repository';
import { passwordResetRepository } from '../repositories/passwordReset.repository';
import { hashPassword, comparePassword, generateResetToken, hashResetToken } from '../utils/password';
import { signToken } from '../utils/jwt';
import { emailService } from './email.service';
import { ApiError } from '../middleware/error.middleware';
import { env } from '../config/env';
import { toUserDto } from '../utils/serialize';
import { RegisterInput, LoginInput, ForgotPasswordInput, ResetPasswordInput } from '../validators/auth.validator';

export const authService = {
  async register(input: RegisterInput) {
    const existingUsername = await userRepository.findByUsername(input.username);
    if (existingUsername) {
      throw new ApiError(409, 'username already taken');
    }

    const existingEmail = await userRepository.findByEmail(input.email);
    if (existingEmail) {
      throw new ApiError(409, 'email already registered');
    }

    const hashPw = await hashPassword(input.password);
    const user = await userRepository.createStudent({
      username: input.username,
      email: input.email,
      hashPassword: hashPw,
    });

    return {
      id: user.id.toString(),
      username: user.username,
      email: user.email,
      role: user.role,
    };
  },

  // The frontend calls this on load to check a stored token and to show
  // who is signed in. A token for a deleted account is treated as invalid.
  async me(userId: bigint) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new ApiError(401, 'invalid or expired token');
    }
    return toUserDto(user);
  },

  async login(input: LoginInput) {
    const user = await userRepository.findByUsername(input.username);

    // Deliberately generic: don't reveal whether the username exists.
    if (!user) {
      throw new ApiError(401, 'invalid username or password');
    }

    const passwordMatches = await comparePassword(input.password, user.hashPassword);
    if (!passwordMatches) {
      throw new ApiError(401, 'invalid username or password');
    }

    const token = signToken({ userId: user.id.toString(), role: user.role });
    return { token };
  },

  async forgotPassword(input: ForgotPasswordInput) {
    const user = await userRepository.findByEmail(input.email);

    // Always behave identically whether or not the email exists.
    if (user) {
      const { rawToken, tokenHash } = generateResetToken();
      const expiresAt = new Date(Date.now() + env.resetTokenExpiryMinutes * 60 * 1000);

      await passwordResetRepository.create({
        userId: user.id,
        tokenHash,
        expiresAt,
      });

      // A delivery failure is logged, not returned: an error here would
      // reveal that the email exists.
      try {
        await emailService.sendPasswordReset(user.email, rawToken);
      } catch (err) {
        console.error(`failed to send password reset email to ${user.email}`, err);
      }
    }

    return { message: 'If that email exists, a reset link has been sent' };
  },

  async resetPassword(input: ResetPasswordInput) {
    const tokenHash = hashResetToken(input.token);
    const resetRecord = await passwordResetRepository.findValidByTokenHash(tokenHash);

    if (!resetRecord) {
      throw new ApiError(400, 'invalid or expired token');
    }

    const newHash = await hashPassword(input.newPassword);
    await userRepository.updatePassword(resetRecord.userId, newHash);
    await passwordResetRepository.markUsed(resetRecord.id);

    return { message: 'password reset successful' };
  },
};

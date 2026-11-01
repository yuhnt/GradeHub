import { Router } from 'express';
import { authController } from '../controllers/auth.controller';
import { validateBody } from '../middleware/validate.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { authenticate } from '../middleware/auth.middleware';
import {
  registerSchema,
  loginSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from '../validators/auth.validator';

const router = Router();

router.post('/register', validateBody(registerSchema), asyncHandler(authController.register));
router.post('/login', validateBody(loginSchema), asyncHandler(authController.login));
router.post('/logout', authController.logout);
router.get('/me', authenticate, asyncHandler(authController.me));
router.post('/forgot-password', validateBody(forgotPasswordSchema), asyncHandler(authController.forgotPassword));
router.post('/reset-password', validateBody(resetPasswordSchema), asyncHandler(authController.resetPassword));

export default router;

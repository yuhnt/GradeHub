import { Router } from 'express';
import { gradeController } from '../controllers/grade.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { validateBody, validateIdParam } from '../middleware/validate.middleware';
import { gradeSchema } from '../validators/grade.validator';

const router = Router();

// PATCH  /api/submissions/:id/grade  - teacher grades/overwrites a grade
// GET    /api/submissions/:id/grade  - view grade (student: own only, teacher: own task only)

router.patch(
  '/:id/grade',
  authenticate,
  authorize('teacher', 'only teachers can grade submissions'),
  validateIdParam,
  validateBody(gradeSchema),
  asyncHandler(gradeController.grade)
);

router.get('/:id/grade', authenticate, validateIdParam, asyncHandler(gradeController.getGrade));

export default router;

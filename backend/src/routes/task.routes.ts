import { Router } from 'express';
import { taskController } from '../controllers/task.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { validateBody, validateIdParam } from '../middleware/validate.middleware';
import { uploadPdf } from '../middleware/upload.middleware';
import { createTaskSchema, updateTaskSchema } from '../validators/task.validator';

const router = Router();

// POST   /api/tasks                     - create (teacher only)
// GET    /api/tasks                     - list all (any authenticated user)
// GET    /api/tasks/:id                 - view one (any authenticated user)
// PUT    /api/tasks/:id                 - update (teacher, must own it)
// DELETE /api/tasks/:id                 - delete (teacher, must own it)
// GET    /api/tasks/:id/submissions     - teacher views all submissions for their task
// POST   /api/tasks/:id/test-submission - teacher submits a test PDF

router.use(authenticate);

router.post(
  '/',
  authorize('teacher', 'not allowed to create task'),
  validateBody(createTaskSchema),
  asyncHandler(taskController.create)
);

router.get('/', asyncHandler(taskController.list));

router.get('/:id', validateIdParam, asyncHandler(taskController.getById));

router.put(
  '/:id',
  authorize('teacher', 'not allowed to update task'),
  validateIdParam,
  validateBody(updateTaskSchema),
  asyncHandler(taskController.update)
);

router.delete(
  '/:id',
  authorize('teacher', 'forbidden'),
  validateIdParam,
  asyncHandler(taskController.delete)
);

router.get(
  '/:id/submissions',
  authorize('teacher', 'only teacher can view'),
  validateIdParam,
  asyncHandler(taskController.listSubmissions)
);

// Role and :id are checked before uploadPdf so rejected requests never
// write a file to disk.
router.post(
  '/:id/test-submission',
  authorize('teacher', 'only teachers can submit test files'),
  validateIdParam,
  uploadPdf,
  asyncHandler(taskController.createTestSubmission)
);

export default router;

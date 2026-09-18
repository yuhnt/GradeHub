import { Router } from 'express';
import { submissionController } from '../controllers/submission.controller';
import { authenticate, authorize } from '../middleware/auth.middleware';
import { asyncHandler } from '../middleware/error.middleware';
import { validateIdParam } from '../middleware/validate.middleware';
import { uploadPdf } from '../middleware/upload.middleware';

const router = Router();

// POST   /api/submissions          - student submits a PDF (multipart/form-data)
// GET    /api/submissions/mine     - student lists their own submissions (?taskId= optional)
// DELETE /api/submissions/:id      - student deletes their own submission
// GET    /api/submissions/:id      - view one (student: own only, teacher: own task only)
// GET    /api/submissions/:id/file - download the PDF (same visibility rules)

router.post(
  '/',
  authenticate,
  authorize('student', 'only students can submit'),
  uploadPdf,
  asyncHandler(submissionController.create)
);

// Declared before '/:id' so "mine" isn't taken for an id.
router.get(
  '/mine',
  authenticate,
  authorize('student', 'only students have their own submissions'),
  asyncHandler(submissionController.listMine)
);

router.delete(
  '/:id',
  authenticate,
  authorize('student', 'only students allowed to delete'),
  validateIdParam,
  asyncHandler(submissionController.delete)
);

router.get('/:id', authenticate, validateIdParam, asyncHandler(submissionController.getById));

router.get('/:id/file', authenticate, validateIdParam, asyncHandler(submissionController.downloadFile));

export default router;

import { Router } from 'express';
import authRoutes from './auth.routes';
import taskRoutes from './task.routes';
import submissionRoutes from './submission.routes';
import gradeRoutes from './grade.routes';

const router = Router();

router.use('/auth', authRoutes);
router.use('/tasks', taskRoutes);
router.use('/submissions', submissionRoutes);
// Grade routes are nested under /submissions/:id/grade, same base path.
router.use('/submissions', gradeRoutes);

export default router;

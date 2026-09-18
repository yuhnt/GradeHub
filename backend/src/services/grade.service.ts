import type { JwtPayload } from '../utils/jwt';
import { submissionRepository } from '../repositories/submission.repository';
import { ApiError } from '../middleware/error.middleware';
import { toGradeDto } from '../utils/serialize';
import { GradeInput } from '../validators/grade.validator';
import { findVisibleSubmission } from './submission.service';

export const gradeService = {
  /**
   * Grades are embedded in the submission row. Re-grading is allowed at
   * any time (decision 2): every call overwrites grade, feedback and gradeAt.
   */
  async grade(submissionId: bigint, teacherId: bigint, input: GradeInput) {
    const submission = await submissionRepository.findByIdWithTask(submissionId);
    // Other teachers' submissions are hidden behind the same 404.
    if (!submission || submission.task.createdBy !== teacherId) {
      throw new ApiError(404, 'submission not found');
    }

    const updated = await submissionRepository.updateGrade(submissionId, {
      grade: input.grade,
      feedback: input.feedback ?? null,
    });

    return {
      id: Number(updated.id),
      submissionId: Number(updated.id),
      grade: updated.grade,
      feedback: updated.feedback,
      gradedAt: updated.gradeAt ? updated.gradeAt.toISOString() : null,
    };
  },

  // An ungraded submission isn't an error: it comes back as graded: false.
  async getGrade(submissionId: bigint, user: JwtPayload) {
    const submission = await findVisibleSubmission(submissionId, user);
    return toGradeDto(submission);
  },
};

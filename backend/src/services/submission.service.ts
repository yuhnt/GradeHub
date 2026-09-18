import { Prisma } from '@prisma/client';
import type { JwtPayload } from '../utils/jwt';
import { taskRepository } from '../repositories/task.repository';
import { submissionRepository } from '../repositories/submission.repository';
import { ApiError } from '../middleware/error.middleware';
import { toSubmissionDto, toTaskSummaryDto } from '../utils/serialize';
import { removeFile } from '../utils/files';

const NOT_FOUND = 'submission not found';
const ALREADY_SUBMITTED = 'submission already exists for this task';

function isPastDeadline(deadline: Date) {
  return Date.now() > deadline.getTime();
}

/**
 * Loads a submission the requester is allowed to see, or throws 404
 * (never 403, so existence isn't leaked):
 *  - students: only their own real submissions
 *  - teachers: any submission on a task they created (including their tests)
 */
export async function findVisibleSubmission(submissionId: bigint, user: JwtPayload) {
  const submission = await submissionRepository.findByIdWithTask(submissionId);
  if (!submission) {
    throw new ApiError(404, NOT_FOUND);
  }

  const userId = BigInt(user.userId);
  const visible =
    user.role === 'student'
      ? submission.userId === userId && !submission.isTest
      : submission.task.createdBy === userId;

  if (!visible) {
    throw new ApiError(404, NOT_FOUND);
  }
  return submission;
}

export const submissionService = {
  async create(studentId: bigint, taskId: bigint, filePath: string) {
    try {
      const task = await taskRepository.findById(taskId);
      if (!task) {
        throw new ApiError(404, 'task not found');
      }
      if (isPastDeadline(task.deadline)) {
        throw new ApiError(400, 'deadline has passed');
      }

      const existing = await submissionRepository.findActiveByUserAndTask(studentId, taskId);
      if (existing) {
        throw new ApiError(409, ALREADY_SUBMITTED);
      }

      try {
        const submission = await submissionRepository.create({
          userId: studentId,
          taskId,
          filePath,
          isTest: false,
        });
        return toSubmissionDto(submission);
      } catch (err) {
        // Two concurrent submits can both pass the check above; the partial
        // unique index on (userId, taskId) WHERE isTest = false catches it.
        if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === 'P2002') {
          throw new ApiError(409, ALREADY_SUBMITTED);
        }
        throw err;
      }
    } catch (err) {
      // Whatever went wrong, don't leave an orphaned PDF behind.
      await removeFile(filePath);
      throw err;
    }
  },

  // Lets a student find their submission for a task after a page reload,
  // and powers the "My submissions" page. An unknown taskId just matches
  // nothing: an empty list, not a 404.
  async listMine(studentId: bigint, taskId?: bigint) {
    const submissions = await submissionRepository.findRealByUser(studentId, taskId);
    return {
      submissions: submissions.map(({ task, ...submission }) => ({
        ...toSubmissionDto(submission),
        task: toTaskSummaryDto(task),
      })),
    };
  },

  async delete(submissionId: bigint, studentId: bigint) {
    const submission = await submissionRepository.findByIdWithTask(submissionId);
    if (!submission || submission.userId !== studentId || submission.isTest) {
      throw new ApiError(404, NOT_FOUND);
    }
    if (isPastDeadline(submission.task.deadline)) {
      throw new ApiError(400, 'deadline has passed');
    }

    await submissionRepository.delete(submissionId);
    await removeFile(submission.filePath);
    return { msg: 'Submissions deleted' };
  },

  async getById(submissionId: bigint, user: JwtPayload) {
    const submission = await findVisibleSubmission(submissionId, user);
    return toSubmissionDto(submission);
  },

  /** Path of the stored PDF, with the same visibility rules as getById. */
  async getFilePath(submissionId: bigint, user: JwtPayload) {
    const submission = await findVisibleSubmission(submissionId, user);
    return submission.filePath;
  },
};

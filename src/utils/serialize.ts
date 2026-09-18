import type { Submission, Task } from '@prisma/client';

// BigInt can't go through JSON.stringify, so every response goes through
// one of these. Autoincrement ids stay far below Number.MAX_SAFE_INTEGER.

export function toTaskDto(task: Task) {
  return {
    id: Number(task.id),
    title: task.title,
    description: task.description,
    deadline: task.deadline.toISOString(),
    createdBy: Number(task.createdBy),
    createdAt: task.createdAt.toISOString(),
  };
}

export function toSubmissionDto(submission: Submission) {
  return {
    id: Number(submission.id),
    taskId: Number(submission.taskId),
    userId: Number(submission.userId),
    filePath: submission.filePath,
    submittedAt: submission.createdAt.toISOString(),
    grade: submission.grade,
    feedback: submission.feedback,
    isTest: submission.isTest,
  };
}

export function toGradeDto(submission: Submission) {
  return {
    submissionId: Number(submission.id),
    graded: submission.grade !== null,
    grade: submission.grade,
    feedback: submission.feedback,
    gradedAt: submission.gradeAt ? submission.gradeAt.toISOString() : null,
  };
}

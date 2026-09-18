import type { Submission, Task, User } from '@prisma/client';

// BigInt can't go through JSON.stringify, so every response goes through
// one of these. Autoincrement ids stay far below Number.MAX_SAFE_INTEGER.

// Never includes the password hash.
export function toUserDto(user: User) {
  return {
    id: Number(user.id),
    username: user.username,
    email: user.email,
    role: user.role,
  };
}

// Just enough of a task to label a submission with.
export function toTaskSummaryDto(task: Task) {
  return {
    id: Number(task.id),
    title: task.title,
    deadline: task.deadline.toISOString(),
  };
}

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
    gradedAt: submission.gradeAt ? submission.gradeAt.toISOString() : null,
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

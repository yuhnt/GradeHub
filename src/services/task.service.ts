import { taskRepository } from '../repositories/task.repository';
import { submissionRepository } from '../repositories/submission.repository';
import { ApiError } from '../middleware/error.middleware';
import { toSubmissionDto, toTaskDto } from '../utils/serialize';
import { removeFile } from '../utils/files';
import { ListTasksQuery, TaskInput } from '../validators/task.validator';

// Ownership-sensitive lookups answer 404 for both "missing" and "not yours".
const NOT_FOUND_OR_NOT_OWNER = 'task not found, or you did not create this task';

async function findTaskOr404(taskId: bigint) {
  const task = await taskRepository.findById(taskId);
  if (!task) {
    throw new ApiError(404, 'task not found');
  }
  return task;
}

export const taskService = {
  async create(input: TaskInput, teacherId: bigint) {
    const task = await taskRepository.create({ ...input, createdBy: teacherId });
    return toTaskDto(task);
  },

  async list({ page, limit }: ListTasksQuery) {
    const [tasks, total] = await taskRepository.findPage((page - 1) * limit, limit);
    return {
      tasks: tasks.map(toTaskDto),
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    };
  },

  async getById(taskId: bigint) {
    return toTaskDto(await findTaskOr404(taskId));
  },

  async update(taskId: bigint, input: TaskInput, teacherId: bigint) {
    const task = await findTaskOr404(taskId);
    // Task existence isn't ownership-sensitive, so 403 rather than 404.
    if (task.createdBy !== teacherId) {
      throw new ApiError(403, 'not allowed to update task');
    }
    // Deadline is freely editable (decision 5): moving it just changes
    // which future submit/delete requests are accepted.
    const updated = await taskRepository.update(taskId, input);
    return toTaskDto(updated);
  },

  async delete(taskId: bigint, teacherId: bigint) {
    const task = await findTaskOr404(taskId);
    if (task.createdBy !== teacherId) {
      throw new ApiError(403, 'forbidden');
    }

    // Rows cascade in the DB (decision 1); the PDFs on disk have to be
    // cleaned up by hand, so grab their paths before the rows are gone.
    const files = await submissionRepository.findFilePathsByTask(taskId);
    await taskRepository.delete(taskId);
    await Promise.all(files.map((f) => removeFile(f.filePath)));

    return { msg: 'task deleted successful' };
  },

  async listSubmissions(taskId: bigint, teacherId: bigint) {
    const task = await taskRepository.findById(taskId);
    if (!task || task.createdBy !== teacherId) {
      throw new ApiError(404, NOT_FOUND_OR_NOT_OWNER);
    }

    // Test submissions never show up in the real grading view.
    const submissions = await submissionRepository.findRealByTask(taskId);
    return {
      task: {
        id: Number(task.id),
        title: task.title,
        description: task.description,
        deadline: task.deadline.toISOString(),
      },
      submissions: submissions.map(toSubmissionDto),
    };
  },

  async createTestSubmission(taskId: bigint, teacherId: bigint, filePath: string) {
    try {
      const task = await findTaskOr404(taskId);
      if (task.createdBy !== teacherId) {
        throw new ApiError(403, 'you did not create this task');
      }

      // Unrestricted (decision 6): no deadline check, no one-per-task limit.
      const submission = await submissionRepository.create({
        userId: teacherId,
        taskId,
        filePath,
        isTest: true,
      });
      return toSubmissionDto(submission);
    } catch (err) {
      await removeFile(filePath);
      throw err;
    }
  },
};

import { api } from './client';
import type {
  GradeInput,
  GradeResult,
  MySubmission,
  Submission,
  Task,
  TaskInput,
  TaskListParams,
  TaskPage,
  TaskSubmissions,
  User,
} from './types';

export const authApi = {
  login: (body: { username: string; password: string }) => api.post<{ token: string }>('/auth/login', { json: body }),
  register: (body: { username: string; email: string; password: string }) =>
    api.post<unknown>('/auth/register', { json: body }),
  logout: () => api.post<{ msg: string }>('/auth/logout'),
  me: () => api.get<User>('/auth/me'),
  forgotPassword: (body: { email: string }) => api.post<{ message: string }>('/auth/forgot-password', { json: body }),
  resetPassword: (body: { token: string; newPassword: string }) =>
    api.post<{ message: string }>('/auth/reset-password', { json: body }),
};

export const tasksApi = {
  list: ({ page, limit, status, mine }: TaskListParams) =>
    api.get<TaskPage>('/tasks', { query: { page, limit, status, mine: mine || undefined } }),
  get: (id: number) => api.get<Task>(`/tasks/${id}`),
  create: (input: TaskInput) => api.post<Task>('/tasks', { json: input }),
  update: (id: number, input: TaskInput) => api.put<Task>(`/tasks/${id}`, { json: input }),
  remove: (id: number) => api.delete<{ msg: string }>(`/tasks/${id}`),
  submissions: (id: number) => api.get<TaskSubmissions>(`/tasks/${id}/submissions`),
  uploadTest: (id: number, file: File) =>
    api.post<Submission>(`/tasks/${id}/test-submission`, { formData: pdfForm(file) }),
};

export const submissionsApi = {
  mine: (taskId?: number) => api.get<{ submissions: MySubmission[] }>('/submissions/mine', { query: { taskId } }),
  get: (id: number) => api.get<Submission>(`/submissions/${id}`),
  file: (id: number) => api.blob(`/submissions/${id}/file`),
  submit: (taskId: number, file: File) => {
    const form = pdfForm(file);
    form.append('taskId', String(taskId));
    return api.post<Submission>('/submissions', { formData: form });
  },
  remove: (id: number) => api.delete<{ msg: string }>(`/submissions/${id}`),
  grade: (id: number, input: GradeInput) => api.patch<GradeResult>(`/submissions/${id}/grade`, { json: input }),
};

function pdfForm(file: File) {
  const form = new FormData();
  form.append('file', file, file.name);
  return form;
}

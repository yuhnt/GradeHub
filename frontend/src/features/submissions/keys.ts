export const submissionKeys = {
  all: ['submissions'] as const,
  mine: () => [...submissionKeys.all, 'mine'] as const,
  mineForTask: (taskId: number | 'all') => [...submissionKeys.mine(), taskId] as const,
  detail: (id: number) => [...submissionKeys.all, 'detail', id] as const,
  file: (id: number) => [...submissionKeys.detail(id), 'file'] as const,
};

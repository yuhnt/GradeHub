import type { TaskListParams } from '../../api/types';

export const taskKeys = {
  all: ['tasks'] as const,
  lists: () => [...taskKeys.all, 'list'] as const,
  list: (params: TaskListParams) => [...taskKeys.lists(), params] as const,
  detail: (id: number) => [...taskKeys.all, 'detail', id] as const,
  submissions: (id: number) => [...taskKeys.detail(id), 'submissions'] as const,
};

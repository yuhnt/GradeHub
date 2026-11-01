import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '../../api/endpoints';
import type { TaskInput, TaskListParams } from '../../api/types';
import { submissionKeys } from '../submissions/keys';
import { taskKeys } from './keys';

export function useTaskList(params: TaskListParams) {
  return useQuery({
    queryKey: taskKeys.list(params),
    queryFn: () => tasksApi.list(params),
    // Keep the current page on screen while the next one loads.
    placeholderData: keepPreviousData,
  });
}

export function useTask(id: number, enabled = true) {
  return useQuery({ queryKey: taskKeys.detail(id), queryFn: () => tasksApi.get(id), enabled });
}

export function useTaskSubmissions(id: number, enabled = true) {
  return useQuery({
    queryKey: taskKeys.submissions(id),
    queryFn: () => tasksApi.submissions(id),
    enabled,
  });
}

export function useCreateTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TaskInput) => tasksApi.create(input),
    onSuccess: (task) => {
      queryClient.setQueryData(taskKeys.detail(task.id), task);
      return queryClient.invalidateQueries({ queryKey: taskKeys.lists() });
    },
  });
}

export function useUpdateTask(id: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: TaskInput) => tasksApi.update(id, input),
    onSuccess: (task) => {
      queryClient.setQueryData(taskKeys.detail(id), task);
      return queryClient.invalidateQueries({ queryKey: taskKeys.all });
    },
  });
}

export function useDeleteTask() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => tasksApi.remove(id),
    onSuccess: (_result, id) => {
      queryClient.removeQueries({ queryKey: taskKeys.detail(id) });
      return Promise.all([
        queryClient.invalidateQueries({ queryKey: taskKeys.lists() }),
        queryClient.invalidateQueries({ queryKey: submissionKeys.all }),
      ]);
    },
  });
}

export function useUploadTestSubmission(taskId: number) {
  return useMutation({ mutationFn: (file: File) => tasksApi.uploadTest(taskId, file) });
}

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { submissionsApi } from '../../api/endpoints';
import type { GradeInput } from '../../api/types';
import { taskKeys } from '../tasks/keys';
import { submissionKeys } from './keys';

/** The student's own submissions: all of them, or the one for a task. */
export function useMySubmissions({ taskId, enabled = true }: { taskId?: number; enabled?: boolean } = {}) {
  return useQuery({
    queryKey: submissionKeys.mineForTask(taskId ?? 'all'),
    queryFn: () => submissionsApi.mine(taskId).then((res) => res.submissions),
    enabled,
  });
}

export function useSubmission(id: number) {
  return useQuery({ queryKey: submissionKeys.detail(id), queryFn: () => submissionsApi.get(id) });
}

export function useSubmissionFile(id: number) {
  return useQuery({
    queryKey: submissionKeys.file(id),
    queryFn: () => submissionsApi.file(id),
    // A stored PDF never changes; a new upload gets a new submission id.
    staleTime: Infinity,
    gcTime: 5 * 60_000,
  });
}

export function useSubmitPdf(taskId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => submissionsApi.submit(taskId, file),
    // Also after a failure: a 409 means another tab already submitted.
    onSettled: () => queryClient.invalidateQueries({ queryKey: submissionKeys.mine() }),
  });
}

export function useDeleteSubmission() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: number) => submissionsApi.remove(id),
    onSuccess: (_result, id) => {
      queryClient.removeQueries({ queryKey: submissionKeys.detail(id) });
      return queryClient.invalidateQueries({ queryKey: submissionKeys.mine() });
    },
  });
}

export function useGradeSubmission(submissionId: number, taskId: number) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: GradeInput) => submissionsApi.grade(submissionId, input),
    onSuccess: () =>
      Promise.all([
        queryClient.invalidateQueries({ queryKey: submissionKeys.detail(submissionId), exact: true }),
        queryClient.invalidateQueries({ queryKey: taskKeys.submissions(taskId) }),
      ]),
  });
}

import { useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { toast } from 'sonner';
import type { Submission } from '../../api/types';
import { Alert } from '../../components/ui/Alert';
import { Button } from '../../components/ui/Button';
import { CharacterCount, TextAreaField, TextField } from '../../components/ui/Field';
import { formatDateTime } from '../../lib/dates';
import { errorMessage } from '../../lib/errors';
import { useGradeSubmission } from './hooks';

const FEEDBACK_MAX = 5000;
const GRADE_MESSAGE = 'Enter a whole number from 0 to 100.';

const gradeSchema = z.object({
  grade: z
    .number({ error: GRADE_MESSAGE })
    .int(GRADE_MESSAGE)
    .min(0, GRADE_MESSAGE)
    .max(100, GRADE_MESSAGE),
  feedback: z.string().max(FEEDBACK_MAX, `Keep feedback under ${FEEDBACK_MAX} characters.`),
});

type GradeValues = z.infer<typeof gradeSchema>;

interface GradeFormProps {
  submission: Submission;
  /** Where "Save and next" goes; hidden when there is nothing left to grade. */
  onSaveAndNext?: (() => void) | undefined;
}

/** Grade 0-100 plus optional feedback. Saving again overwrites (decision 2). */
export function GradeForm({ submission, onSaveAndNext }: GradeFormProps) {
  const gradeMutation = useGradeSubmission(submission.id, submission.taskId);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState<'save' | 'next' | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors },
  } = useForm<GradeValues>({
    resolver: zodResolver(gradeSchema),
    defaultValues: { grade: submission.grade ?? undefined, feedback: submission.feedback ?? '' },
  });
  const feedback = useWatch({ control, name: 'feedback' }) ?? '';

  const onSubmit = handleSubmit(async ({ grade, feedback }, event) => {
    // Which of the two submit buttons was used.
    const submitter = (event?.nativeEvent as SubmitEvent | undefined)?.submitter;
    const intent = submitter instanceof HTMLButtonElement && submitter.value === 'next' ? 'next' : 'save';
    setFormError(null);
    setSaving(intent);
    try {
      await gradeMutation.mutateAsync({ grade, feedback: feedback.trim() || null });
    } catch (error) {
      setFormError(errorMessage(error));
      return;
    } finally {
      setSaving(null);
    }
    toast.success(`Grade saved: ${grade} / 100.`);
    if (intent === 'next') onSaveAndNext?.();
  });

  const alreadyGraded = submission.grade !== null;

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-4">
      {formError && <Alert tone="error">{formError}</Alert>}
      <TextField
        label="Grade (0–100)"
        type="number"
        inputMode="numeric"
        min={0}
        max={100}
        step={1}
        className="max-w-32 text-lg font-semibold"
        error={errors.grade?.message}
        {...register('grade', { valueAsNumber: true })}
      />
      <TextAreaField
        label="Feedback"
        rows={8}
        placeholder="Optional. The student sees this with their grade."
        error={errors.feedback?.message}
        aside={<CharacterCount value={feedback} max={FEEDBACK_MAX} />}
        {...register('feedback')}
      />
      {alreadyGraded && submission.gradedAt && (
        <p className="text-xs text-slate-500">
          Last graded {formatDateTime(submission.gradedAt)}. Saving replaces the grade and feedback.
        </p>
      )}
      <div className="flex flex-col gap-2">
        <Button type="submit" value="save" loading={saving === 'save'} disabled={saving !== null}>
          {alreadyGraded ? 'Update grade' : 'Save grade'}
        </Button>
        {onSaveAndNext && (
          <Button type="submit" value="next" variant="secondary" loading={saving === 'next'} disabled={saving !== null}>
            Save and grade next
          </Button>
        )}
      </div>
    </form>
  );
}

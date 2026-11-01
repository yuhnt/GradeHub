import { useState, type ReactNode } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import type { TaskInput } from '../../api/types';
import { Alert } from '../../components/ui/Alert';
import { Button, ButtonLink } from '../../components/ui/Button';
import { CharacterCount, TextAreaField, TextField } from '../../components/ui/Field';
import { fromDateTimeLocalValue, timeZoneLabel, toDateTimeLocalValue } from '../../lib/dates';
import { errorMessage } from '../../lib/errors';
import { DESCRIPTION_MAX, TITLE_MAX, taskFormSchema, type TaskFormValues } from './schemas';

interface TaskFormProps {
  defaultValues?: TaskFormValues;
  submitLabel: string;
  cancelTo: string;
  notice?: ReactNode;
  onSubmit: (input: TaskInput) => Promise<void>;
}

export function TaskForm({ defaultValues, submitLabel, cancelTo, notice, onSubmit }: TaskFormProps) {
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm<TaskFormValues>({
    resolver: zodResolver(taskFormSchema),
    defaultValues: defaultValues ?? { title: '', description: '', deadline: '' },
  });
  const [title = '', description = ''] = useWatch({ control, name: ['title', 'description'] });

  const submit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await onSubmit({
        title: values.title,
        description: values.description,
        deadline: fromDateTimeLocalValue(values.deadline),
      });
    } catch (error) {
      setFormError(errorMessage(error));
    }
  });

  return (
    <form onSubmit={submit} noValidate className="space-y-5">
      {notice}
      {formError && <Alert tone="error">{formError}</Alert>}
      <TextField
        label="Title"
        autoFocus={!defaultValues}
        placeholder="e.g. Lab report 3: Normalisation"
        error={errors.title?.message}
        aside={<CharacterCount value={title} max={TITLE_MAX} />}
        {...register('title')}
      />
      <TextAreaField
        label="Instructions"
        rows={8}
        placeholder="What should students hand in? How will it be graded?"
        error={errors.description?.message}
        aside={<CharacterCount value={description} max={DESCRIPTION_MAX} />}
        {...register('description')}
      />
      <TextField
        label="Deadline"
        type="datetime-local"
        min={toDateTimeLocalValue(new Date())}
        className="sm:max-w-xs"
        hint={`Your time zone: ${timeZoneLabel()}. Students can't submit or delete after this time.`}
        error={errors.deadline?.message}
        {...register('deadline')}
      />
      <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-5">
        <ButtonLink to={cancelTo} variant="secondary">
          Cancel
        </ButtonLink>
        <Button type="submit" loading={isSubmitting}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}

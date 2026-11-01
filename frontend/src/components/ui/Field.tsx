import { useId, type ComponentProps, type ReactNode } from 'react';
import { cn } from '../../lib/cn';

const control =
  'block w-full rounded-md border-0 bg-white px-3 py-2 text-sm text-slate-900 shadow-sm ring-1 ring-slate-300 ring-inset placeholder:text-slate-400 focus:ring-2 focus:ring-indigo-600 focus:outline-none disabled:bg-slate-50 disabled:text-slate-500 aria-invalid:ring-red-500';

interface FieldShellProps {
  id: string;
  label: string;
  hint?: ReactNode;
  error?: string | undefined;
  /** Shown at the right of the label, e.g. a character counter or a link. */
  aside?: ReactNode;
  children: ReactNode;
}

function FieldShell({ id, label, hint, error, aside, children }: FieldShellProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-2">
        <label htmlFor={id} className="block text-sm font-medium text-slate-800">
          {label}
        </label>
        {aside && <div className="text-xs text-slate-500">{aside}</div>}
      </div>
      {children}
      {error ? (
        <p id={`${id}-error`} className="text-sm text-red-600">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${id}-hint`} className="text-xs text-slate-500">
            {hint}
          </p>
        )
      )}
    </div>
  );
}

function describedBy(id: string, error?: string, hint?: ReactNode) {
  if (error) return `${id}-error`;
  return hint ? `${id}-hint` : undefined;
}

interface TextFieldProps extends ComponentProps<'input'> {
  label: string;
  hint?: ReactNode;
  error?: string | undefined;
  aside?: ReactNode;
}

export function TextField({ label, hint, error, aside, className, id: idProp, ...props }: TextFieldProps) {
  const generated = useId();
  const id = idProp ?? generated;
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} aside={aside}>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={cn(control, className)}
        {...props}
      />
    </FieldShell>
  );
}

interface TextAreaFieldProps extends ComponentProps<'textarea'> {
  label: string;
  hint?: ReactNode;
  error?: string | undefined;
  aside?: ReactNode;
}

export function TextAreaField({ label, hint, error, aside, className, id: idProp, ...props }: TextAreaFieldProps) {
  const generated = useId();
  const id = idProp ?? generated;
  return (
    <FieldShell id={id} label={label} hint={hint} error={error} aside={aside}>
      <textarea
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={cn(control, 'min-h-28', className)}
        {...props}
      />
    </FieldShell>
  );
}

/** "120 / 1000", turning red past the limit. */
export function CharacterCount({ value, max }: { value: string; max: number }) {
  return (
    <span className={cn(value.length > max && 'font-medium text-red-600')}>
      {value.length} / {max}
    </span>
  );
}

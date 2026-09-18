import type { ReactNode } from 'react';
import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react';
import { cn } from '../../lib/cn';

type Tone = 'error' | 'warning' | 'success' | 'info';

const tones: Record<Tone, { box: string; icon: typeof Info }> = {
  error: { box: 'bg-red-50 text-red-800 ring-red-200', icon: CircleAlert },
  warning: { box: 'bg-amber-50 text-amber-900 ring-amber-200', icon: TriangleAlert },
  success: { box: 'bg-emerald-50 text-emerald-800 ring-emerald-200', icon: CircleCheck },
  info: { box: 'bg-sky-50 text-sky-900 ring-sky-200', icon: Info },
};

interface AlertProps {
  tone?: Tone;
  title?: string;
  children?: ReactNode;
  action?: ReactNode;
  className?: string;
}

export function Alert({ tone = 'info', title, children, action, className }: AlertProps) {
  const { box, icon: Icon } = tones[tone];
  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={cn('flex gap-3 rounded-md p-3 text-sm ring-1 ring-inset', box, className)}
    >
      <Icon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
      <div className="min-w-0 flex-1 space-y-1">
        {title && <p className="font-medium">{title}</p>}
        {children && <div>{children}</div>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}

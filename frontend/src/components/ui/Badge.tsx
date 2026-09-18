import type { ReactNode } from 'react';
import { cn } from '../../lib/cn';

export type BadgeTone = 'gray' | 'green' | 'amber' | 'red' | 'indigo' | 'sky';

const tones: Record<BadgeTone, string> = {
  gray: 'bg-slate-100 text-slate-700 ring-slate-500/20',
  green: 'bg-emerald-50 text-emerald-700 ring-emerald-600/20',
  amber: 'bg-amber-50 text-amber-800 ring-amber-600/20',
  red: 'bg-red-50 text-red-700 ring-red-600/20',
  indigo: 'bg-indigo-50 text-indigo-700 ring-indigo-600/20',
  sky: 'bg-sky-50 text-sky-700 ring-sky-600/20',
};

export function Badge({ tone = 'gray', children, className }: { tone?: BadgeTone; children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium whitespace-nowrap ring-1 ring-inset',
        tones[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

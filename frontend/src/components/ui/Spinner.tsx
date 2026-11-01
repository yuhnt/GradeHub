import { LoaderCircle } from 'lucide-react';
import { cn } from '../../lib/cn';

export function Spinner({ className }: { className?: string }) {
  return <LoaderCircle aria-hidden="true" className={cn('animate-spin', className ?? 'size-5')} />;
}

/** Centered spinner for a page or panel that is still loading. */
export function LoadingState({ label = 'Loading…', className }: { label?: string; className?: string }) {
  return (
    <div role="status" className={cn('flex items-center justify-center gap-3 py-16 text-slate-500', className)}>
      <Spinner />
      <span className="text-sm">{label}</span>
    </div>
  );
}

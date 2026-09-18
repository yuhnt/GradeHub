import { Link } from 'react-router';
import { ClipboardCheck } from 'lucide-react';

export function Logo({ to = '/' }: { to?: string }) {
  return (
    <Link to={to} className="flex items-center gap-2 font-semibold text-slate-900">
      <span className="flex size-8 items-center justify-center rounded-lg bg-indigo-600 text-white">
        <ClipboardCheck aria-hidden="true" className="size-5" />
      </span>
      Task Grading Hub
    </Link>
  );
}

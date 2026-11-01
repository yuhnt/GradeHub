import { Clock, Lock } from 'lucide-react';
import { formatDateTime, formatRelative, isPast, isWithin, ONE_DAY_MS } from '../lib/dates';
import { Badge } from './ui/Badge';

/** Open / Due soon / Closed, from the deadline and the current time. */
export function DeadlineBadge({ deadline, now }: { deadline: string; now: number }) {
  if (isPast(deadline, now)) {
    return (
      <Badge tone="gray">
        <Lock aria-hidden="true" className="size-3" />
        Closed
      </Badge>
    );
  }
  if (isWithin(deadline, ONE_DAY_MS, now)) {
    return (
      <Badge tone="amber">
        <Clock aria-hidden="true" className="size-3" />
        Due soon
      </Badge>
    );
  }
  return <Badge tone="green">Open</Badge>;
}

/** "Due 20 Sep 2026, 17:00 (in 2 days)" / "Closed 18 Sep 2026, 09:00 (3 hours ago)". */
export function DeadlineText({ deadline, now }: { deadline: string; now: number }) {
  const closed = isPast(deadline, now);
  return (
    <span>
      {closed ? 'Closed' : 'Due'}{' '}
      <time dateTime={deadline} className="font-medium text-slate-800">
        {formatDateTime(deadline)}
      </time>{' '}
      <span className="text-slate-500">({formatRelative(deadline, now)})</span>
    </span>
  );
}

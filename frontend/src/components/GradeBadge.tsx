import { Badge } from './ui/Badge';

export function GradeBadge({ grade }: { grade: number | null }) {
  if (grade === null) return <Badge tone="gray">Not graded</Badge>;
  return <Badge tone="indigo">{grade} / 100</Badge>;
}

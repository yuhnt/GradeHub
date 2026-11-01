import { useEffect, useState } from 'react';

/**
 * The current time, refreshed every `intervalMs`. Lets deadline badges and
 * submit buttons flip to "closed" while the page stays open.
 */
export function useNow(intervalMs = 30_000): number {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);
  return now;
}

export function useDocumentTitle(title: string | undefined) {
  useEffect(() => {
    document.title = title ? `${title} · Task Grading Hub` : 'Task Grading Hub';
  }, [title]);
}

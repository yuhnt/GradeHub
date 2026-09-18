// Dates come from the API as UTC ISO strings and are shown in the viewer's
// own time zone and locale.

const dateTimeFormat = new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' });
const relativeFormat = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

export function formatDateTime(iso: string): string {
  return dateTimeFormat.format(new Date(iso));
}

/** "in 3 days", "2 hours ago", "now". */
export function formatRelative(iso: string, now = Date.now()): string {
  const diff = new Date(iso).getTime() - now;
  const abs = Math.abs(diff);
  if (abs < MINUTE) return relativeFormat.format(0, 'second');
  if (abs < HOUR) return relativeFormat.format(Math.round(diff / MINUTE), 'minute');
  if (abs < DAY) return relativeFormat.format(Math.round(diff / HOUR), 'hour');
  if (abs < 30 * DAY) return relativeFormat.format(Math.round(diff / DAY), 'day');
  if (abs < 365 * DAY) return relativeFormat.format(Math.round(diff / (30 * DAY)), 'month');
  return relativeFormat.format(Math.round(diff / (365 * DAY)), 'year');
}

/** Matches the backend rule: a deadline has passed once now is after it. */
export function isPast(iso: string, now = Date.now()): boolean {
  return now > new Date(iso).getTime();
}

export function isWithin(iso: string, ms: number, now = Date.now()): boolean {
  const diff = new Date(iso).getTime() - now;
  return diff > 0 && diff <= ms;
}

export const ONE_DAY_MS = DAY;

const pad = (n: number) => String(n).padStart(2, '0');

/** ISO string -> value for <input type="datetime-local">, in local time. */
export function toDateTimeLocalValue(iso: string | Date): string {
  const d = typeof iso === 'string' ? new Date(iso) : iso;
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** <input type="datetime-local"> value (local time) -> ISO string in UTC. */
export function fromDateTimeLocalValue(value: string): string {
  return new Date(value).toISOString();
}

/** e.g. "Asia/Ho_Chi_Minh (GMT+7)". */
export function timeZoneLabel(date = new Date()): string {
  const zone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const offset = -date.getTimezoneOffset();
  const sign = offset >= 0 ? '+' : '-';
  const hours = Math.floor(Math.abs(offset) / 60);
  const minutes = Math.abs(offset) % 60;
  return `${zone} (GMT${sign}${hours}${minutes ? `:${pad(minutes)}` : ''})`;
}

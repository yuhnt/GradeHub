import { describe, expect, it } from 'vitest';
import { ApiError } from '../api/client';
import { decodeJwt, isTokenExpired, msUntilExpiry } from '../auth/jwt';
import { student, tokenFor } from '../test/db';
import { formatRelative, fromDateTimeLocalValue, isPast, isWithin, toDateTimeLocalValue } from './dates';
import { errorMessage } from './errors';
import { MAX_PDF_BYTES, asPdf, formatBytes, toFileName, validatePdf } from './files';
import { parseId } from './params';

describe('dates', () => {
  const now = Date.parse('2026-09-18T10:00:00Z');

  it('treats a deadline as passed only once now is after it, like the backend', () => {
    expect(isPast('2026-09-18T09:59:59Z', now)).toBe(true);
    expect(isPast('2026-09-18T10:00:00Z', now)).toBe(false);
    expect(isPast('2026-09-18T10:00:01Z', now)).toBe(false);
  });

  it('knows when a deadline is close', () => {
    expect(isWithin('2026-09-18T20:00:00Z', 24 * 3600_000, now)).toBe(true);
    expect(isWithin('2026-09-20T20:00:00Z', 24 * 3600_000, now)).toBe(false);
    expect(isWithin('2026-09-18T09:00:00Z', 24 * 3600_000, now)).toBe(false);
  });

  it('round-trips a datetime-local value through UTC', () => {
    const local = '2026-10-01T17:30';
    expect(toDateTimeLocalValue(fromDateTimeLocalValue(local))).toBe(local);
  });

  it('describes time relative to now', () => {
    expect(formatRelative('2026-09-21T10:00:00Z', now)).toMatch(/3 days/);
    expect(formatRelative('2026-09-18T08:00:00Z', now)).toMatch(/2 hours ago/);
  });
});

describe('files', () => {
  const file = (name: string, type: string, size = 1000) => {
    const f = new File(['x'], name, { type });
    Object.defineProperty(f, 'size', { value: size });
    return f;
  };

  it('accepts a PDF under the limit', () => {
    expect(validatePdf(file('essay.pdf', 'application/pdf'))).toBeNull();
    expect(validatePdf(file('essay.pdf', 'application/pdf', MAX_PDF_BYTES))).toBeNull();
  });

  it('rejects other types, empty files and files over 10 MB', () => {
    expect(validatePdf(file('essay.docx', 'application/msword'))).toMatch(/Only PDF/);
    expect(validatePdf(file('essay.pdf', 'application/pdf', 0))).toMatch(/empty/);
    expect(validatePdf(file('essay.pdf', 'application/pdf', MAX_PDF_BYTES + 1))).toMatch(/limit is 10 MB/);
  });

  it('labels an untyped .pdf so the backend accepts it', () => {
    const untyped = file('essay.PDF', '');
    expect(validatePdf(untyped)).toBeNull();
    expect(asPdf(untyped).type).toBe('application/pdf');
  });

  it('builds safe file names, stripping accents', () => {
    expect(toFileName(['Bài tập 1: SQL', 'linh'])).toBe('Bai-tap-1-SQL-linh.pdf');
    expect(toFileName(['***'], 'csv')).toBe('download.csv');
  });

  it('formats sizes', () => {
    expect(formatBytes(512)).toBe('512 B');
    expect(formatBytes(2048)).toBe('2 KB');
    expect(formatBytes(3.5 * 1024 * 1024)).toBe('3.5 MB');
  });
});

describe('errorMessage', () => {
  it('rewrites known backend errors', () => {
    expect(errorMessage(new ApiError(400, 'deadline has passed'))).toBe('The deadline for this task has passed.');
    expect(errorMessage(new ApiError(0, 'network error'))).toMatch(/Can't reach the server/);
  });

  it('reports an ended session for any 401 except a failed sign-in', () => {
    expect(errorMessage(new ApiError(401, 'invalid or expired token'))).toMatch(/session has expired/);
    expect(errorMessage(new ApiError(401, 'invalid username or password'))).toBe('Incorrect username or password.');
  });

  it('falls back to the backend text as a sentence', () => {
    expect(errorMessage(new ApiError(400, 'limit must be an integer between 1 and 100'))).toBe(
      'Limit must be an integer between 1 and 100.',
    );
    expect(errorMessage('boom')).toBe('Something went wrong. Please try again.');
  });
});

describe('jwt', () => {
  it('reads the claims and the expiry', () => {
    const token = tokenFor(student, 60);
    expect(decodeJwt(token)).toMatchObject({ userId: String(student.id), role: 'student' });
    expect(msUntilExpiry(token)).toBeGreaterThan(50_000);
    expect(isTokenExpired(token)).toBe(false);
    expect(isTokenExpired(tokenFor(student, -1))).toBe(true);
  });

  it('treats garbage as expired', () => {
    expect(decodeJwt('not-a-jwt')).toBeNull();
    expect(isTokenExpired('a.b.c')).toBe(true);
  });
});

describe('parseId', () => {
  it('accepts positive integers only', () => {
    expect(parseId('42')).toBe(42);
    for (const bad of [undefined, '', '0', '-1', '1.5', 'abc', '99999999999999999999']) {
      expect(parseId(bad)).toBeNull();
    }
  });
});

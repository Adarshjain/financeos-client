import type { DiagnosticsLookupResponse } from '@/lib/api/types';
import type { DiagnosticRecord } from '@/lib/diagnostics/errorLog';
import { formatDate, formatTime } from '@/lib/format';

type Request = NonNullable<DiagnosticsLookupResponse['request']>;
type TimelineEntry = DiagnosticsLookupResponse['timeline'][number];
export type RefType = 'auto' | 'errorId' | 'requestId';

export const REF_TYPE_OPTIONS: { value: RefType; label: string }[] = [
  { value: 'auto', label: 'Auto-detect' },
  { value: 'errorId', label: 'Error ID' },
  { value: 'requestId', label: 'Request ID' },
];

/** Narrow the `?type=` param to a known type. */
export function asRefType(value: string | undefined): RefType {
  return value === 'errorId' || value === 'requestId' ? value : 'auto';
}

/** "13 Oct 1:38 pm" in the app zone; empty when the timestamp is unreadable. */
export function formatWhen(iso: string): string {
  const time = formatTime(iso);
  return time ? `${formatDate(iso, 'list')} ${time}` : '';
}

/** "13 Oct 1:38:49 pm IST" for the Request card. */
export function formatWhenFull(iso: string): string {
  const time = formatTime(iso, { seconds: true });
  return time ? `${formatDate(iso, 'list')} ${time} IST` : '';
}

/** "1:38:49.101 pm" in the app zone. */
export function formatClock(iso: string): string {
  const d = new Date(iso);
  const time = formatTime(d, { seconds: true });
  if (!time) return '';
  return time.replace(/ (am|pm)$/, `.${String(d.getUTCMilliseconds()).padStart(3, '0')} $1`);
}

export type StatusTone = 'success' | 'info' | 'warning' | 'danger';

/** Badge tone for an HTTP status: 4xx/5xx danger, 3xx info, otherwise success. */
export function statusTone(status: number): StatusTone {
  if (status >= 400) return 'danger';
  if (status >= 300) return 'info';
  return 'success';
}

/** Who made the request: email, else the short user id, else Anonymous. */
export function requestUser(request: Request): string {
  if (request.userEmail) return request.userEmail;
  return request.userId ? `User: ${request.userId.slice(0, 8)}…` : 'Anonymous';
}

/** Where a timeline line sits: request-level lines flush left, errors deepest, the rest one step in. */
export function timelineDepth(entry: TimelineEntry): 0 | 1 | 2 {
  const event = (entry.event ?? '').toLowerCase();
  if (event === 'http' || event === 'access') return 0;
  return entry.level.toUpperCase() === 'ERROR' ? 2 : 1;
}

/** "POST /api/v1/reports · 400" for the failures list (method defaults to GET like the report). */
export function failureLine(rec: DiagnosticRecord): string {
  const status = rec.status > 0 ? String(rec.status) : 'Network';
  const when = formatWhen(rec.at);
  return [`${rec.method ?? 'GET'} ${rec.endpoint ?? rec.route}`, status, when].filter(Boolean).join(' · ');
}

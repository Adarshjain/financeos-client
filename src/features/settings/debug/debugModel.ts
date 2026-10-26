import type { DiagnosticsLookupResponse } from '@/lib/api/types';
import { hm12 } from '@/lib/clock12';
import type { DiagnosticRecord } from '@/lib/diagnostics/errorLog';

const APP_ZONE = 'Asia/Kolkata';

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

function parts(iso: string, opts: Intl.DateTimeFormatOptions) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  const map: Record<string, string> = {};
  for (const p of new Intl.DateTimeFormat('en-GB', { timeZone: APP_ZONE, hourCycle: 'h23', ...opts }).formatToParts(d)) {
    map[p.type] = p.value;
  }
  return map;
}

/** "1:38:49 pm" from formatted 24-hour hour/minute/second parts; `fraction` goes before the am/pm. */
function withSeconds12(p: Record<string, string>, fraction = ''): string {
  const [time, suffix] = hm12(Number(p.hour), Number(p.minute)).split(' ');
  return `${time}:${p.second}${fraction} ${suffix}`;
}

/** "13 Oct 1:38 pm" in the app zone; empty when the timestamp is unreadable. */
export function formatWhen(iso: string): string {
  const p = parts(iso, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  return p ? `${p.day} ${p.month} ${hm12(Number(p.hour), Number(p.minute))}` : '';
}

/** "13 Oct 1:38:49 pm IST" for the Request card. */
export function formatWhenFull(iso: string): string {
  const p = parts(iso, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return p ? `${p.day} ${p.month} ${withSeconds12(p)} IST` : '';
}

/** "1:38:49.101 pm" in the app zone. */
export function formatClock(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '';
  const p = parts(iso, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  return p ? withSeconds12(p, `.${String(d.getUTCMilliseconds()).padStart(3, '0')}`) : '';
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

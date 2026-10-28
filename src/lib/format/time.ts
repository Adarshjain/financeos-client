import { clock12, hm12 } from '@/lib/clock12';

import { formatDate, istParts } from './date';

function toInstant(at: string | Date | null | undefined): Date | null {
  if (at === null || at === undefined || at === '') return null;
  // A zone-less datetime is IST, as formatDate reads it.
  const zoneless = typeof at === 'string' && /^\d{4}-\d{2}-\d{2}T[\d:.]+$/.test(at);
  const d = typeof at === 'string' ? new Date(zoneless ? `${at}+05:30` : at) : at;
  return Number.isNaN(d.getTime()) ? null : d;
}

/** 12-hour IST time: "3:30 pm", with seconds "3:30:12 pm". */
export function formatTime(at: string | Date | null | undefined, opts: { seconds?: boolean } = {}): string {
  const d = toInstant(at);
  if (!d) return '';
  if (!opts.seconds) return clock12(d);
  const { h, min, s } = istParts(d);
  return hm12(h, min).replace(/ (am|pm)$/, `:${String(s).padStart(2, '0')} $1`);
}

/** "13 Oct, 3:30 pm" (IST). */
export function formatDateTime(at: string | Date | null | undefined): string {
  const d = toInstant(at);
  if (!d) return '';
  return `${formatDate(d, 'list')}, ${formatTime(d)}`;
}

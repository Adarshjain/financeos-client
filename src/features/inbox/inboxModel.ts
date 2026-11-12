import type { InboxItemResponse, InboxSummaryResponse } from '@/lib/api/types';

export type InboxSectionKey = 'act_now' | 'needs_look' | 'info';

export const INBOX_SECTIONS: { key: InboxSectionKey; title: string }[] = [
  { key: 'act_now', title: 'Act now' },
  { key: 'needs_look', title: 'Needs a look' },
  { key: 'info', title: 'Info' },
];

/** Actions the bill dialogs (Upcoming) handle. */
export const BILL_ACTION_TYPES = ['mark_paid', 'set_details'] as const;
export type BillActionType = (typeof BILL_ACTION_TYPES)[number];

export function isBillAction(type: string): type is BillActionType {
  return (BILL_ACTION_TYPES as readonly string[]).includes(type);
}

/** Same counting rule as the server: rows per section; the badge is act-now plus needs-look. */
export function summarise(items: InboxItemResponse[]): InboxSummaryResponse {
  let actNow = 0;
  let needsLook = 0;
  let info = 0;
  for (const item of items) {
    if (item.section === 'act_now') actNow++;
    else if (item.section === 'needs_look') needsLook++;
    else info++;
  }
  return { actNow, needsLook, info, badge: actNow + needsLook };
}

/** "4 to act · 2 to look", or a calm line when nothing needs the user. */
export function headerCounts(summary: InboxSummaryResponse | undefined): string | null {
  if (!summary) return null;
  const parts: string[] = [];
  if (summary.actNow > 0) parts.push(`${summary.actNow} to act`);
  if (summary.needsLook > 0) parts.push(`${summary.needsLook} to look`);
  if (parts.length === 0) return summary.info > 0 ? 'Nothing urgent' : null;
  return parts.join(' · ');
}

/** Nav pill text: the count capped at 99+. Null when there is nothing to show. */
export function formatBadge(count: number | null | undefined): string | null {
  if (!count || count <= 0) return null;
  return count > 99 ? '99+' : String(count);
}

export const INBOX_SECTION_TITLES: Record<InboxSectionKey, string> = {
  act_now: 'Act now',
  needs_look: 'Needs a look',
  info: 'Updates',
};

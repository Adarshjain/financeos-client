import type { InboxActionResponse, InboxItemResponse, InboxSummaryResponse } from '@/lib/api/types';
import { todayInAppZone } from '@/lib/date-range';
import { parseCalendarDate, toCalendarDate } from '@/lib/utils';

export type InboxSectionKey = 'act_now' | 'needs_look' | 'info';

export const INBOX_SECTIONS: { key: InboxSectionKey; title: string }[] = [
  { key: 'act_now', title: 'Act now' },
  { key: 'needs_look', title: 'Needs a look' },
  { key: 'info', title: 'Info' },
];

/** Severity stripe colour: critical rose, warning amber, info slate. */
export function severityStripeClass(severity: string): string {
  switch (severity) {
    case 'critical':
      return 'bg-rose-500';
    case 'warning':
      return 'bg-amber-500';
    default:
      return 'bg-slate-300 dark:bg-slate-600';
  }
}

/** Actions the row renders as buttons; snooze and dismiss get their own controls. */
export const BILL_ACTION_TYPES = ['mark_paid', 'confirm_payment', 'set_details'] as const;
export type BillActionType = (typeof BILL_ACTION_TYPES)[number];

export function isBillAction(type: string): type is BillActionType {
  return (BILL_ACTION_TYPES as readonly string[]).includes(type);
}

export function primaryActions(item: InboxItemResponse): InboxActionResponse[] {
  return item.actions.filter((a) => a.type !== 'snooze' && a.type !== 'dismiss');
}

/** Snooze is only offered on item rows (the server rejects it on summary rows). */
export function canSnooze(item: InboxItemResponse): boolean {
  return item.rowType === 'item' && item.actions.some((a) => a.type === 'snooze');
}

export function canDismiss(item: InboxItemResponse): boolean {
  return item.actions.some((a) => a.type === 'dismiss');
}

/** Where a navigation action lands: its own href, else the row's. */
export function actionHref(action: InboxActionResponse, item: InboxItemResponse): string | null {
  return action.href ?? item.href ?? null;
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

/** Business today (IST) plus n days, as YYYY-MM-DD. */
export function appTodayPlus(days: number): string {
  const d = parseCalendarDate(todayInAppZone());
  d.setDate(d.getDate() + days);
  return toCalendarDate(d);
}

export const SNOOZE_PRESETS: { label: string; days: number }[] = [
  { label: 'Tomorrow', days: 1 },
  { label: 'In 3 days', days: 3 },
  { label: 'Next week', days: 7 },
];

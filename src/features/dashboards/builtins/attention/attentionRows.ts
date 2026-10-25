// Which inbox rows the Home widget shows: the few most urgent decisions.

import type { InboxItemResponse } from '@/lib/api/types';

/** How many decisions the widget shows before pointing at the Inbox page. */
export const INBOX_WIDGET_ROW_LIMIT = 4;

/** Act-now rows first, then needs-a-look, up to the limit; info rows stay on the Inbox page. */
export function inboxWidgetRows(items: InboxItemResponse[], limit = INBOX_WIDGET_ROW_LIMIT): InboxItemResponse[] {
  const actNow = items.filter((i) => i.section === 'act_now');
  const needsLook = items.filter((i) => i.section === 'needs_look');
  return [...actNow, ...needsLook].slice(0, limit);
}

/** The row's own place on the Inbox page (the page scrolls to and rings `?item=`). */
export function inboxItemHref(key: string): string {
  return `/inbox?item=${encodeURIComponent(key)}`;
}

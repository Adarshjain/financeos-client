/** The two tabs of Inbox, in order. `href` is the Dinero route. */
import { appHref } from '@/features/shell/routes';

export interface InboxTab {
  id: 'inbox' | 'updates';
  label: string;
  /** Top-bar title on this tab. */
  title: string;
  href: string;
}

export const INBOX_HREF = appHref('/inbox');
export const UPDATES_HREF = appHref('/inbox/updates');

export const inboxTabs: InboxTab[] = [
  { id: 'inbox', label: 'To do', title: 'Inbox', href: INBOX_HREF },
  { id: 'updates', label: 'Updates', title: 'Inbox', href: UPDATES_HREF },
];

/** The tab a pathname belongs to; anything else under /inbox counts as To do. */
export function activeInboxTab(pathname: string | null | undefined): InboxTab {
  const path = (pathname ?? '').replace(/\/+$/, '');
  if (path === UPDATES_HREF || path.startsWith(`${UPDATES_HREF}/`)) return inboxTabs[1];
  return inboxTabs[0];
}

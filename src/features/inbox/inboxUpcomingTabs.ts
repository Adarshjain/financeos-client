/** The three tabs shared by Inbox and Upcoming, in board order. `href` is the Dinero preview route. */
import { appHref } from '@/features/shell/routes';
export interface InboxUpcomingTab {
  id: 'inbox' | 'upcoming' | 'calendar';
  label: string;
  /** Top-bar title on this tab. */
  title: string;
  href: string;
}

export const INBOX_HREF = appHref('/inbox');
export const UPCOMING_HREF = appHref('/upcoming');
export const CALENDAR_HREF = `${UPCOMING_HREF}/calendar`;

export const inboxUpcomingTabs: InboxUpcomingTab[] = [
  { id: 'inbox', label: 'Inbox', title: 'Inbox', href: INBOX_HREF },
  { id: 'upcoming', label: 'Upcoming', title: 'Upcoming', href: UPCOMING_HREF },
  { id: 'calendar', label: 'Calendar', title: 'Upcoming', href: CALENDAR_HREF },
];

/** The tab a pathname belongs to; anything else under /ds/upcoming counts as Upcoming. */
export function activeInboxUpcomingTab(pathname: string | null | undefined): InboxUpcomingTab {
  const path = (pathname ?? '').replace(/\/+$/, '');
  if (path === CALENDAR_HREF || path.startsWith(`${CALENDAR_HREF}/`)) return inboxUpcomingTabs[2];
  if (path === UPCOMING_HREF || path.startsWith(`${UPCOMING_HREF}/`)) return inboxUpcomingTabs[1];
  return inboxUpcomingTabs[0];
}

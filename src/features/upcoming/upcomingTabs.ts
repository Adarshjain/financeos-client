/** The two tabs of Upcoming, in order. `href` is the Dinero route. */
import { appHref } from '@/features/shell/routes';

export interface UpcomingTab {
  id: 'list' | 'calendar';
  label: string;
  /** Top-bar title on this tab. */
  title: string;
  href: string;
}

export const UPCOMING_HREF = appHref('/upcoming');
export const CALENDAR_HREF = `${UPCOMING_HREF}/calendar`;

export const upcomingTabs: UpcomingTab[] = [
  { id: 'list', label: 'List', title: 'Upcoming', href: UPCOMING_HREF },
  { id: 'calendar', label: 'Calendar', title: 'Upcoming', href: CALENDAR_HREF },
];

/** The tab a pathname belongs to; anything else under /upcoming counts as List. */
export function activeUpcomingTab(pathname: string | null | undefined): UpcomingTab {
  const path = (pathname ?? '').replace(/\/+$/, '');
  if (path === CALENDAR_HREF || path.startsWith(`${CALENDAR_HREF}/`)) return upcomingTabs[1];
  return upcomingTabs[0];
}

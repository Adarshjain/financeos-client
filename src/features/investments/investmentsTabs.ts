/** The four tabs of Investments, each a Dinero page under `/investments`. */
import { appHref } from '@/features/shell/routes';

export type InvestmentsTabId = 'holdings' | 'retirement' | 'activity' | 'fno';

export interface InvestmentsTab {
  id: InvestmentsTabId;
  label: string;
  /** The path; `appHref` turns it into the app route. */
  path: string;
}

export const INVESTMENTS_PATH = '/investments';

export const investmentsTabs: InvestmentsTab[] = [
  { id: 'holdings', label: 'Holdings', path: INVESTMENTS_PATH },
  { id: 'retirement', label: 'Retirement', path: '/investments/retirement' },
  { id: 'activity', label: 'Activity', path: '/investments/activity' },
  { id: 'fno', label: 'F&O', path: '/investments/fno' },
];

export type ActivityChoiceId = 'trades' | 'dividends' | 'corporate-actions';

export interface ActivityChoice {
  id: ActivityChoiceId;
  label: string;
  path: string;
}

/** The three lists under the Activity tab, each its own route. */
export const activityChoices: ActivityChoice[] = [
  { id: 'trades', label: 'Trades', path: '/investments/activity' },
  { id: 'dividends', label: 'Dividends', path: '/investments/activity/dividends' },
  { id: 'corporate-actions', label: 'Corporate actions', path: '/investments/activity/corporate-actions' },
];

/** Where a tab goes. */
export function investmentsTabHref(tab: InvestmentsTab): string {
  return appHref(tab.path);
}

/** The Holdings tab URL. */
export const HOLDINGS_HREF = appHref(INVESTMENTS_PATH);

/** A holding's own page. */
export function holdingHref(instrumentId: string): string {
  return appHref(`${INVESTMENTS_PATH}/${instrumentId}`);
}

/** The Import tradebook page: its own page under Investments, outside the tab strip. */
export const INVESTMENTS_IMPORT_HREF = appHref('/investments/import');

/** The first segment under `/investments` ('' for the Holdings address itself), trailing slash ignored. */
function investmentsSegments(pathname: string | null | undefined): string[] {
  const path = (pathname ?? '').replace(/\/+$/, '');
  return path.startsWith(`${HOLDINGS_HREF}/`) ? path.slice(HOLDINGS_HREF.length + 1).split('/') : [];
}

/**
 * The tab a pathname belongs to: Retirement owns `/investments/retirement/**`, Activity owns
 * `/investments/activity/**`, F&O owns `/investments/fno`; anything else (a holding's id included) is Holdings.
 */
export function activeInvestmentsTab(pathname: string | null | undefined): InvestmentsTabId {
  const [first] = investmentsSegments(pathname);
  if (first === 'retirement' || first === 'activity') return first;
  return first === 'fno' ? 'fno' : 'holdings';
}

/** Which list the Activity tab shows for a pathname: Trades unless Dividends or Corporate actions is the address. */
export function activeActivityChoice(pathname: string | null | undefined): ActivityChoiceId {
  const [first, second] = investmentsSegments(pathname);
  if (first !== 'activity') return 'trades';
  return second === 'dividends' || second === 'corporate-actions' ? second : 'trades';
}

/** Every screen the shell keys its + on: a tab, or one of the screens inside Retirement and Activity. */
export type InvestmentsViewId = 'holdings' | 'retirement' | 'epf' | 'nps' | 'trades' | 'dividends' | 'corporate-actions' | 'fno';

/** The screen a pathname is on (`/investments/retirement/epf` is EPF; the tab strip still lights Retirement). */
export function activeInvestmentsView(pathname: string | null | undefined): InvestmentsViewId {
  const tab = activeInvestmentsTab(pathname);
  if (tab === 'activity') return activeActivityChoice(pathname);
  if (tab === 'retirement') {
    const [, second] = investmentsSegments(pathname);
    return second === 'epf' || second === 'nps' ? second : 'retirement';
  }
  return tab;
}

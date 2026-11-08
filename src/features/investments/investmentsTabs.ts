/** The tabs of the Stocks & funds area, each a Dinero page under `/investments`. */
import { appHref } from '@/features/shell/routes';

export type InvestmentsTabId = 'holdings' | 'dividends' | 'tradebook' | 'fno' | 'corporate-actions';

export interface InvestmentsTab {
  id: InvestmentsTabId;
  label: string;
  /** The path; `appHref` turns it into the app route. */
  path: string;
}

export const INVESTMENTS_PATH = '/investments';

export const investmentsTabs: InvestmentsTab[] = [
  { id: 'holdings', label: 'Holdings', path: `${INVESTMENTS_PATH}/holdings` },
  { id: 'dividends', label: 'Dividends', path: '/investments/dividends' },
  { id: 'tradebook', label: 'Tradebook', path: '/investments/tradebook' },
  { id: 'fno', label: 'F&O', path: '/investments/fno' },
  { id: 'corporate-actions', label: 'Corporate actions', path: '/investments/corporate-actions' },
];

/** Where a tab goes. */
export function investmentsTabHref(tab: InvestmentsTab): string {
  return appHref(tab.path);
}

/** The Investments landing: one card per product. */
export const INVESTMENTS_HREF = appHref(INVESTMENTS_PATH);

/** The Holdings tab URL. */
export const HOLDINGS_HREF = appHref(`${INVESTMENTS_PATH}/holdings`);

/** A holding's own page. */
export function holdingHref(instrumentId: string): string {
  return appHref(`${INVESTMENTS_PATH}/${instrumentId}`);
}

/** The Import tradebook page: its own page under Investments, outside the tab strip. */
export const INVESTMENTS_IMPORT_HREF = appHref('/investments/import');

/** The segments under `/investments` ([] for the landing itself), trailing slash ignored. */
function investmentsSegments(pathname: string | null | undefined): string[] {
  const path = (pathname ?? '').replace(/\/+$/, '');
  return path.startsWith(`${INVESTMENTS_HREF}/`) ? path.slice(INVESTMENTS_HREF.length + 1).split('/') : [];
}

/**
 * The tab a pathname belongs to (`/investments/dividends` is Dividends); anything else (a holding's id, the landing,
 * EPF and NPS included) is Holdings.
 */
export function activeInvestmentsTab(pathname: string | null | undefined): InvestmentsTabId {
  const [first] = investmentsSegments(pathname);
  return investmentsTabs.find((t) => t.id !== 'holdings' && t.id === first)?.id ?? 'holdings';
}

/** Every screen the shell keys its frame and + on: the landing, a stocks tab, or EPF / NPS. */
export type InvestmentsViewId = 'overview' | InvestmentsTabId | 'epf' | 'nps';

/** The screen a pathname is on (`/investments` is the landing; `/investments/epf` is EPF). */
export function activeInvestmentsView(pathname: string | null | undefined): InvestmentsViewId {
  const [first] = investmentsSegments(pathname);
  if (first === undefined) return 'overview';
  if (first === 'epf' || first === 'nps') return first;
  return activeInvestmentsTab(pathname);
}

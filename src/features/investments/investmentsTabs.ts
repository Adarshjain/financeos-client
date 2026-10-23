/** The six tabs of Investments. Holdings is built in Dinero; the rest stay on their Legacy pages until their step lands. */
import { appHref } from '@/features/shell/routes';

export type InvestmentsTabId = 'holdings' | 'tradebook' | 'dividends' | 'fno' | 'corporate-actions' | 'instruments';

export interface InvestmentsTab {
  id: InvestmentsTabId;
  label: string;
  /** The Legacy-shaped path; `appHref` turns it into the Dinero route once that page is built. */
  path: string;
  /** Tabs that show a count (the counts load on their own). */
  counted: boolean;
}

export const INVESTMENTS_PATH = '/investments';

export const investmentsTabs: InvestmentsTab[] = [
  { id: 'holdings', label: 'Holdings', path: INVESTMENTS_PATH, counted: false },
  { id: 'tradebook', label: 'Tradebook', path: '/investments/tradebook', counted: true },
  { id: 'dividends', label: 'Dividends', path: '/investments/dividends', counted: true },
  { id: 'fno', label: 'F&O', path: '/investments/fno', counted: true },
  { id: 'corporate-actions', label: 'Corporate actions', path: '/investments/corporate-actions', counted: true },
  { id: 'instruments', label: 'Instruments', path: '/investments/instruments', counted: false },
];

/** Where a tab goes: the Dinero page when built, else its Legacy page. */
export function investmentsTabHref(tab: InvestmentsTab): string {
  return appHref(tab.path);
}

/** The Holdings tab URL. */
export const HOLDINGS_HREF = appHref(INVESTMENTS_PATH);

/** A holding's own page. */
export function holdingHref(instrumentId: string): string {
  return appHref(`${INVESTMENTS_PATH}/${instrumentId}`);
}

/** A holding's own page (`/ds/investments/<id>`): it carries its own top bar and tabs, outside the Investments tab strip. */
export function isHoldingDetailPath(pathname: string | null | undefined): boolean {
  const path = (pathname ?? '').replace(/\/+$/, '');
  if (!path.startsWith(`${HOLDINGS_HREF}/`)) return false;
  const rest = path.slice(HOLDINGS_HREF.length + 1);
  return rest !== '' && !rest.includes('/');
}

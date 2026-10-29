/** The seven tabs of Investments, each a Dinero page under `/investments`. */
import { appHref } from '@/features/shell/routes';

export type InvestmentsTabId = 'holdings' | 'epf' | 'tradebook' | 'dividends' | 'fno' | 'corporate-actions' | 'instruments';

export interface InvestmentsTab {
  id: InvestmentsTabId;
  label: string;
  /** The Legacy-shaped path; `appHref` turns it into the Dinero route. */
  path: string;
}

export const INVESTMENTS_PATH = '/investments';

export const investmentsTabs: InvestmentsTab[] = [
  { id: 'holdings', label: 'Holdings', path: INVESTMENTS_PATH },
  { id: 'epf', label: 'EPF', path: '/investments/epf' },
  { id: 'dividends', label: 'Dividends', path: '/investments/dividends' },
  { id: 'tradebook', label: 'Tradebook', path: '/investments/tradebook' },
  { id: 'fno', label: 'F&O', path: '/investments/fno' },
  { id: 'corporate-actions', label: 'Corporate actions', path: '/investments/corporate-actions' },
  { id: 'instruments', label: 'Instruments', path: '/investments/instruments' },
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

/** The tab a pathname belongs to (`/investments/dividends` is Dividends); anything else is Holdings. */
export function activeInvestmentsTab(pathname: string | null | undefined): InvestmentsTabId {
  const path = (pathname ?? '').replace(/\/+$/, '');
  const segment = path.startsWith(`${HOLDINGS_HREF}/`) ? path.slice(HOLDINGS_HREF.length + 1) : '';
  const tab = investmentsTabs.find((t) => t.path !== INVESTMENTS_PATH && t.path.slice(INVESTMENTS_PATH.length + 1) === segment);
  return tab?.id ?? 'holdings';
}

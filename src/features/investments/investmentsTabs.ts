/** The six tabs of Investments, each a Dinero page under `/investments`. */
import { appHref } from '@/features/shell/routes';

export type InvestmentsTabId = 'holdings' | 'tradebook' | 'dividends' | 'fno' | 'corporate-actions' | 'instruments';

export interface InvestmentsTab {
  id: InvestmentsTabId;
  label: string;
  /** The Legacy-shaped path; `appHref` turns it into the Dinero route. */
  path: string;
}

export const INVESTMENTS_PATH = '/investments';

export const investmentsTabs: InvestmentsTab[] = [
  { id: 'holdings', label: 'Holdings', path: INVESTMENTS_PATH },
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

/** Pages under Investments that are neither a tab nor a holding. */
const OWN_PAGE_SEGMENTS = new Set(['import']);

/** The tab pages under Investments (`tradebook`, `dividends`…), which are not holdings. */
const TAB_SEGMENTS = new Set(
  investmentsTabs.filter((t) => t.path !== INVESTMENTS_PATH).map((t) => t.path.slice(INVESTMENTS_PATH.length + 1)),
);

/** A holding's own page (`/investments/<id>`): it carries its own top bar and tabs, outside the Investments tab strip. */
export function isHoldingDetailPath(pathname: string | null | undefined): boolean {
  const path = (pathname ?? '').replace(/\/+$/, '');
  if (!path.startsWith(`${HOLDINGS_HREF}/`)) return false;
  const rest = path.slice(HOLDINGS_HREF.length + 1);
  return rest !== '' && !rest.includes('/') && !TAB_SEGMENTS.has(rest) && !OWN_PAGE_SEGMENTS.has(rest);
}

/** The Import tradebook page (`/investments/import`): it carries its own top bar and no tab strip. */
export function isImportPath(pathname: string | null | undefined): boolean {
  return (pathname ?? '').replace(/\/+$/, '') === INVESTMENTS_IMPORT_HREF;
}

/** The tab a pathname belongs to (`/investments/dividends` is Dividends); anything else is Holdings. */
export function activeInvestmentsTab(pathname: string | null | undefined): InvestmentsTabId {
  const path = (pathname ?? '').replace(/\/+$/, '');
  const segment = path.startsWith(`${HOLDINGS_HREF}/`) ? path.slice(HOLDINGS_HREF.length + 1) : '';
  const tab = investmentsTabs.find((t) => t.path !== INVESTMENTS_PATH && t.path.slice(INVESTMENTS_PATH.length + 1) === segment);
  return tab?.id ?? 'holdings';
}

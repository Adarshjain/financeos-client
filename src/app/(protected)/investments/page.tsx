import { Account, isAccountOfType } from '@/lib/account.types';
import { accountsApi, corporateActionsApi, dividendsApi, instrumentsApi, investmentsApi, sipsApi } from '@/lib/apiClient';
import {
  AccountType,
  CorporateAction,
  Dividend,
  Instrument,
  PagedInvestmentTransactionResponse,
  Position,
  Sip,
} from '@/lib/types';

import { InvestmentsView } from './InvestmentsView';

// The tradebook is paginated on the server: this page only fetches the first
// page for a fast initial paint. TradebookSection fetches subsequent pages
// (and applies the broker filter) on demand, so we never load the whole table.
const TRANSACTIONS_INITIAL_PAGE_SIZE = 10;

const EMPTY_TRANSACTIONS_PAGE: PagedInvestmentTransactionResponse = {
  content: [],
  totalElements: 0,
  totalPages: 0,
  size: TRANSACTIONS_INITIAL_PAGE_SIZE,
  number: 0,
  first: true,
  last: true,
  empty: true,
};

export default async function InvestmentsPage() {
  const [summary, positionsData, initialTransactions, dividendsData, corporateActionsData, sipsData, instrumentsData, accounts] = await Promise.all([
    investmentsApi.getSummary().catch(() => null),
    investmentsApi.getPositions().catch(() => ({ positions: [] })),
    investmentsApi.listTransactions(0, TRANSACTIONS_INITIAL_PAGE_SIZE).catch(() => EMPTY_TRANSACTIONS_PAGE),
    dividendsApi.list().catch(() => ({ content: [] as Dividend[], totalElements: 0, page: 0, size: 50, totalPages: 0 })),
    corporateActionsApi.listAll().catch(() => [] as CorporateAction[]),
    sipsApi.list().catch(() => [] as Sip[]),
    instrumentsApi.search().catch(() => [] as Instrument[]),
    accountsApi.list().catch(() => [] as Account[]),
  ]);

  const positions: Position[] = positionsData.positions || [];
  const dividends: Dividend[] = dividendsData.content || [];
  const corporateActions: CorporateAction[] = corporateActionsData || [];
  const sips: Sip[] = sipsData || [];
  const instruments: Instrument[] = instrumentsData || [];
  const brokerAccounts = accounts.filter(isAccountOfType(AccountType.BROKER));

  return (
    <InvestmentsView
      summary={summary}
      positions={positions}
      initialTransactions={initialTransactions}
      dividends={dividends}
      corporateActions={corporateActions}
      sips={sips}
      instruments={instruments}
      brokerAccounts={brokerAccounts}
      accounts={accounts}
    />
  );
}

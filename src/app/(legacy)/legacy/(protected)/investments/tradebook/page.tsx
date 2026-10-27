import { dehydrate, HydrationBoundary } from '@tanstack/react-query';

import { Account } from '@/lib/account.types';
import { accountsApi, investmentsApi } from '@/lib/apiClient';
import { getQueryClient } from '@/lib/query/client';
import { keys } from '@/lib/query/keys';
import { PagedInvestmentTransactionResponse } from '@/lib/types';

import { ImportWizardDialog } from '../ImportWizardDialog';
import { RecordTradeDialog } from '../RecordTradeDialog';
import { RefreshPricesButton } from '../RefreshPricesButton';
import { TradebookSection } from '../TradebookSection';

const TRANSACTIONS_INITIAL_PAGE_SIZE = 10;
// Must match the default (unfiltered, first-page) query params `useTradebookSection`
// builds, so the client's useQuery hits this prefetched cache entry on first paint.
const INITIAL_QUERY_PARAMS = { page: 0, size: TRANSACTIONS_INITIAL_PAGE_SIZE };

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

export default async function TradebookPage() {
  const qc = getQueryClient();
  const [initialTransactions, accounts] = await Promise.all([
    investmentsApi
      .listTransactions(0, TRANSACTIONS_INITIAL_PAGE_SIZE)
      .catch(() => EMPTY_TRANSACTIONS_PAGE),
    accountsApi.list().catch(() => [] as Account[]),
  ]);
  qc.setQueryData(
    keys.investments.transactions(INITIAL_QUERY_PARAMS),
    initialTransactions
  );
  qc.setQueryData(keys.accounts.list(), accounts);

  return (
    <div className="pb-20 p-3 sm:p-6 space-y-2 max-w-7xl mx-auto w-full min-w-0 overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            Tradebook & Actions
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Log of buy/sell execution trades, statement imports, and price
            refreshes
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <RecordTradeDialog />
          <ImportWizardDialog />
          <RefreshPricesButton />
        </div>
      </div>

      <HydrationBoundary state={dehydrate(qc)}>
        <TradebookSection initialData={initialTransactions} />
      </HydrationBoundary>
    </div>
  );
}

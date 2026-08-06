import { CreateDividendDialog } from '../CreateDividendDialog';
import { ImportWizardDialog } from '../ImportWizardDialog';
import { RecordTradeDialog } from '../RecordTradeDialog';
import { RefreshPricesButton } from '../RefreshPricesButton';
import { TradebookSection } from '../TradebookSection';
import { Account, isAccountOfType } from '@/lib/account.types';
import { accountsApi, investmentsApi } from '@/lib/apiClient';
import { AccountType, PagedInvestmentTransactionResponse, Position } from '@/lib/types';

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

export default async function TradebookPage() {
  const [initialTransactions, positionsData, accounts] = await Promise.all([
    investmentsApi.listTransactions(0, TRANSACTIONS_INITIAL_PAGE_SIZE).catch(() => EMPTY_TRANSACTIONS_PAGE),
    investmentsApi.getPositions().catch(() => ({ positions: [] })),
    accountsApi.list().catch(() => [] as Account[]),
  ]);

  const positions: Position[] = positionsData.positions || [];
  const brokerAccounts = accounts.filter(isAccountOfType(AccountType.BROKER));

  return (
    <div className="pb-20 p-3 sm:p-6 space-y-4 max-w-7xl mx-auto w-full min-w-0 overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            Tradebook & Actions
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Log of buy/sell execution trades, statement imports, and price refreshes
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <RecordTradeDialog brokerAccounts={brokerAccounts} />
          <ImportWizardDialog brokerAccounts={brokerAccounts} />
          <CreateDividendDialog brokerAccounts={brokerAccounts} positions={positions} />
          <RefreshPricesButton />
        </div>
      </div>

      <TradebookSection
        initialData={initialTransactions}
        brokerAccounts={brokerAccounts}
        accounts={accounts}
      />
    </div>
  );
}

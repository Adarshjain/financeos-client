import { CreateDividendDialog } from '../CreateDividendDialog';
import { DividendsTable } from '../DividendsTable';
import { Account, isAccountOfType } from '@/lib/account.types';
import { accountsApi, dividendsApi, investmentsApi } from '@/lib/apiClient';
import { AccountType, Dividend, Position } from '@/lib/types';

export default async function DividendsPage() {
  const [dividendsData, positionsData, accounts] = await Promise.all([
    dividendsApi.list().catch(() => ({ content: [] as Dividend[], totalElements: 0, page: 0, size: 50, totalPages: 0 })),
    investmentsApi.getPositions().catch(() => ({ positions: [] })),
    accountsApi.list().catch(() => [] as Account[]),
  ]);

  const dividends: Dividend[] = dividendsData.content || [];
  const positions: Position[] = positionsData.positions || [];
  const brokerAccounts = accounts.filter(isAccountOfType(AccountType.BROKER));

  return (
    <div className="pb-20 p-3 sm:p-6 space-y-4 max-w-7xl mx-auto w-full min-w-0 overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            Dividend Income & Payouts
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Recorded cash dividends, bank payouts, and yield distribution log
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CreateDividendDialog brokerAccounts={brokerAccounts} positions={positions} />
        </div>
      </div>

      <DividendsTable dividends={dividends} accounts={accounts} brokerAccounts={brokerAccounts} />
    </div>
  );
}

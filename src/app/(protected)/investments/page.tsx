import { Account, isAccountOfType } from '@/lib/account.types';
import { accountsApi, dividendsApi, investmentsApi } from '@/lib/apiClient';
import { AccountType, Dividend, Position } from '@/lib/types';

import { AllocationCharts } from './AllocationCharts';
import { CreateInstrumentDialog } from './CreateInstrumentDialog';
import { DividendsTable } from './DividendsTable';
import { PortfolioSummaryCards } from './PortfolioSummaryCards';
import { RecordTradeDialog } from './RecordTradeDialog';

export default async function PortfolioOverviewPage() {
  const [summary, positionsData, dividendsData, accounts] = await Promise.all([
    investmentsApi.getSummary().catch(() => null),
    investmentsApi.getPositions().catch(() => ({ positions: [] })),
    dividendsApi.list().catch(() => ({ content: [] as Dividend[], totalElements: 0, page: 0, size: 50, totalPages: 0 })),
    accountsApi.list().catch(() => [] as Account[]),
  ]);

  const positions: Position[] = positionsData.positions || [];
  const dividends: Dividend[] = dividendsData.content || [];
  const brokerAccounts = accounts.filter(isAccountOfType(AccountType.BROKER));

  return (
    <div className="pb-20 p-3 sm:p-6 space-y-2 max-w-7xl mx-auto w-full min-w-0 overflow-x-hidden">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            Portfolio Overview
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Summary metrics, asset allocation, and dividend yield breakdown
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CreateInstrumentDialog />
          <RecordTradeDialog brokerAccounts={brokerAccounts} />
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-2 animate-in fade-in-50 duration-200">
        <PortfolioSummaryCards summary={summary} positionsCount={positions.length} />
        <AllocationCharts summary={summary} positions={positions} />
        <DividendsTable dividends={dividends} accounts={accounts} brokerAccounts={brokerAccounts} />
      </div>
    </div>
  );
}

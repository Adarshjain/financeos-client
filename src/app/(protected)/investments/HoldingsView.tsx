'use client';

import { isAccountOfType } from '@/lib/account.types';
import { useAccounts } from '@/lib/query/hooks/useAccounts';
import { usePositions } from '@/lib/query/hooks/useInvestments';
import { AccountType } from '@/lib/types';

import { CreateInstrumentDialog } from './CreateInstrumentDialog';
import { HoldingsTab } from './HoldingsTab';
import { RecordTradeDialog } from './RecordTradeDialog';

interface HoldingsViewProps {
  /** Rendered between the header and the holdings table (the page's JobsPanel slot). */
  children?: React.ReactNode;
}

export function HoldingsView({ children }: HoldingsViewProps) {
  const { data: positions = [] } = usePositions();
  const { data: accounts = [] } = useAccounts();

  const brokerAccounts = accounts.filter(isAccountOfType(AccountType.BROKER));

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            Portfolio Holdings ({positions.length})
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Active securities positions, cost basis, unrealized P&L, and returns
          </p>
        </div>
        <div className="flex items-center gap-2">
          <CreateInstrumentDialog />
          <RecordTradeDialog />
        </div>
      </div>

      {children}

      <HoldingsTab positions={positions} brokerAccounts={brokerAccounts} />
    </>
  );
}

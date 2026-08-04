'use client';

import {useState} from 'react';

import {Badge} from '@/components/ui/badge';
import {Tabs, TabsContent, TabsList, TabsTrigger} from '@/components/ui/tabs';
import {Account, Broker} from '@/lib/account.types';
import {CorporateAction, Dividend, Instrument, InvestmentSummary, PagedInvestmentTransactionResponse, Position, Sip} from '@/lib/types';

import {AllocationCharts} from './AllocationCharts';
import {CorporateActionsSection} from './CorporateActionsSection';
import {CreateDividendDialog} from './CreateDividendDialog';
import {CreateInstrumentDialog} from './CreateInstrumentDialog';
import {DividendsTable} from './DividendsTable';
import {HoldingsTab} from './HoldingsTab';
import {ImportWizardDialog} from './ImportWizardDialog';
import {InstrumentsSection} from './InstrumentsSection';
import {PortfolioSummaryCards} from './PortfolioSummaryCards';
import {RecordTradeDialog} from './RecordTradeDialog';
import {RefreshPricesButton} from './RefreshPricesButton';
import {SipsSection} from './SipsSection';
import {TradebookSection} from './TradebookSection';

interface InvestmentsViewProps {
  summary: InvestmentSummary | null;
  positions: Position[];
  initialTransactions: PagedInvestmentTransactionResponse;
  dividends: Dividend[];
  corporateActions: CorporateAction[];
  sips: Sip[];
  instruments: Instrument[];
  brokerAccounts: Broker[];
  accounts: Account[];
}

export function InvestmentsView({
                                  summary,
                                  positions,
                                  initialTransactions,
                                  dividends,
                                  corporateActions = [],
                                  sips,
                                  instruments,
                                  brokerAccounts,
                                  accounts,
                                }: InvestmentsViewProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'holdings' | 'actions'>('holdings');

  return (
      <div className="pb-20 p-3 sm:p-6 space-y-2 max-w-7xl mx-auto w-full min-w-0 overflow-x-hidden">
        {/* Top Header */}
        <div className="flex sm:flex-row sm:items-center justify-between gap-3 pb-1">
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            Portfolio
          </h1>
          <div className="flex items-center gap-2">
            <CreateInstrumentDialog/>
            <RecordTradeDialog brokerAccounts={brokerAccounts}/>
          </div>
        </div>

        {/* Main Tabs Bar */}
        <Tabs
            value={activeTab}
            onValueChange={(v) => setActiveTab(v as 'overview' | 'holdings' | 'actions')}
            className="w-full space-y-2"
        >
          <TabsList className="grid w-full grid-cols-3 max-w-md bg-slate-100 dark:bg-slate-900">
            <TabsTrigger value="overview" className="text-xs font-bold">
              Overview
            </TabsTrigger>
            <TabsTrigger value="holdings" className="text-xs font-bold gap-1 px-0 whitespace-normal">
              Holdings
              <span
                  className="text-[10px] font-extrabold bg-blue-100 text-blue-800 dark:bg-blue-950 dark:text-blue-300 px-1.5 py-0.5 rounded-full">
              {positions.length}
            </span>
            </TabsTrigger>
            <TabsTrigger value="actions" className="text-xs font-bold">
              Tradebook & Actions
            </TabsTrigger>
          </TabsList>

          {/* TAB 1: OVERVIEW & REPORTS */}
          <TabsContent value="overview" className="mt-0 space-y-2 animate-in fade-in-50 duration-200">
            <PortfolioSummaryCards summary={summary} positionsCount={positions.length}/>
            <AllocationCharts summary={summary} positions={positions}/>
            <DividendsTable dividends={dividends} accounts={accounts} brokerAccounts={brokerAccounts}/>
          </TabsContent>

          {/* TAB 2: HOLDINGS VIEW */}
          <TabsContent value="holdings" className="mt-0 space-y-2 animate-in fade-in-50 duration-200">
            <HoldingsTab
              summary={summary}
              positions={positions}
              brokerAccounts={brokerAccounts}
            />
          </TabsContent>

          {/* TAB 3: ACTIONS & TRADEBOOK */}
          <TabsContent value="actions" className="mt-0 space-y-2 animate-in fade-in-50 duration-200">
            {/* Actions Quick Toolbar */}
            <div
                className="p-4 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">Portfolio Actions & Sync</h3>
                <p className="text-xs text-slate-500">
                  Record trades, import tradebooks, log dividend income, or refresh live prices.
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                {/*<RecordTradeDialog brokerAccounts={brokerAccounts} />*/}
                <ImportWizardDialog brokerAccounts={brokerAccounts}/>
                <CreateDividendDialog brokerAccounts={brokerAccounts} positions={positions}/>
                <RefreshPricesButton/>
              </div>
            </div>

            <div className="w-full space-y-2">
              <TradebookSection
                  initialData={initialTransactions}
                  brokerAccounts={brokerAccounts}
                  accounts={accounts}
              />
              <InstrumentsSection instruments={instruments} />
              <CorporateActionsSection corporateActions={corporateActions} instruments={instruments} />
              <SipsSection sips={sips} brokerAccounts={brokerAccounts} positions={positions}/>
            </div>
          </TabsContent>
        </Tabs>
      </div>
  );
}

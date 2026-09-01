'use client';

import { Layers, Loader2 } from 'lucide-react';

import { PageActionBar } from '@/components/layout/PageActionBarContext';
import { Card } from '@/components/ui/card';
import { Account, Broker } from '@/lib/account.types';
import { PagedInvestmentTransactionResponse } from '@/lib/types';

import { TradebookFilterBar } from './tradebook/TradebookFilterBar';
import { TradebookMobileCards } from './tradebook/TradebookMobileCards';
import { TradebookTable } from './tradebook/TradebookTable';
import { useTradebookSection } from './tradebook/useTradebookSection';

interface TradebookSectionProps {
  initialData: PagedInvestmentTransactionResponse;
  brokerAccounts: Broker[];
  accounts: Account[];
}

export function TradebookSection({
  initialData,
  brokerAccounts,
  accounts,
}: TradebookSectionProps) {
  const {
    selectedBrokerFilter,
    searchInput,
    setSearchInput,
    search,
    setPage,
    pageSize,
    setPageSize,
    transactions,
    totalElements,
    totalPages,
    isLoading,
    currentPage,
    fetchPage,
    handleBrokerFilterChange,
  } = useTradebookSection({
    initialData,
  });

  return (
    <div className="space-y-2 pb-32">
      {/* Desktop Action Bar Container */}
      <Card className="hidden lg:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl p-3">
        <TradebookFilterBar
          searchInput={searchInput}
          setSearchInput={setSearchInput}
          selectedBrokerFilter={selectedBrokerFilter}
          onBrokerFilterChange={handleBrokerFilterChange}
          brokerAccounts={brokerAccounts}
          currentPage={currentPage}
          pageSize={pageSize}
          totalElements={totalElements}
          totalPages={totalPages}
          onPageChange={setPage}
          onSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(0);
          }}
        />
      </Card>

      {/* Mobile PageActionBar Integration */}
      <PageActionBar>
        <TradebookFilterBar
          searchInput={searchInput}
          setSearchInput={setSearchInput}
          selectedBrokerFilter={selectedBrokerFilter}
          onBrokerFilterChange={handleBrokerFilterChange}
          brokerAccounts={brokerAccounts}
          currentPage={currentPage}
          pageSize={pageSize}
          totalElements={totalElements}
          totalPages={totalPages}
          onPageChange={setPage}
          onSizeChange={(newSize) => {
            setPageSize(newSize);
            setPage(0);
          }}
          isMobile
        />
      </PageActionBar>

      {/* Main Tradebook Cards Display */}
      {totalElements === 0 && !isLoading ? (
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm rounded-xl p-8 text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center mx-auto text-emerald-600 dark:text-emerald-400">
            <Layers className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
              No trades recorded
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              {search
                ? 'No trades match your search criteria.'
                : selectedBrokerFilter === 'all'
                ? 'Record trades manually or import contract notes to track execution history.'
                : 'No trades found for the selected broker account.'}
            </p>
          </div>
        </Card>
      ) : (
        <div className="relative">
          {isLoading && (
            <div className="absolute right-3 top-3 z-10 text-slate-400 bg-white/80 dark:bg-slate-900/80 p-1.5 rounded-full shadow-sm">
              <Loader2 className="w-4 h-4 animate-spin text-emerald-600 dark:text-emerald-400" />
            </div>
          )}

          <TradebookMobileCards
            transactions={transactions}
            brokerAccounts={brokerAccounts}
            accounts={accounts}
            isLoading={isLoading}
            onSuccess={fetchPage}
          />

          <TradebookTable
            transactions={transactions}
            brokerAccounts={brokerAccounts}
            accounts={accounts}
            isLoading={isLoading}
            onSuccess={fetchPage}
          />
        </div>
      )}
    </div>
  );
}

'use client';

import { Activity, Download } from 'lucide-react';

import { PageActionBar } from '@/components/layout/PageActionBarContext';
import { TablePagination } from '@/components/reports/views/TablePagination';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Broker } from '@/lib/account.types';

import { ImportWizardDialog } from '../ImportWizardDialog';
import { DeleteFnoTradeDialog } from './components/DeleteFnoTradeDialog';
import { FnoDesktopTable } from './components/FnoDesktopTable';
import { FnoFilterBar } from './components/FnoFilterBar';
import { FnoMobileCards } from './components/FnoMobileCards';
import { FnoSummaryCards } from './components/FnoSummaryCards';
import { useFnoView } from './components/useFnoView';
import { CreateFnoTradeDialog } from './CreateFnoTradeDialog';

interface FnoViewProps {
  brokerAccounts: Broker[];
}

export function FnoView({ brokerAccounts }: FnoViewProps) {
  const {
    search,
    setSearch,
    contractTypeFilter,
    setContractTypeFilter,
    optionTypeFilter,
    setOptionTypeFilter,
    brokerFilter,
    setBrokerFilter,
    pageSize,
    setPageSize,
    deletingTrade,
    setDeletingTrade,
    isDeleting,
    sortedTrades,
    totalPages,
    pageClamped,
    paginatedTrades,
    metrics,
    hasActiveFilters,
    clearFilters,
    getBrokerName,
    toggleSort,
    handleRefresh,
    handleDeleteConfirm,
    setCurrentPage,
  } = useFnoView({
    brokerAccounts,
  });

  // Filter changes always snap back to page 1 (matches pre-split behavior).
  const searchAndResetPage = (s: string) => {
    setSearch(s);
    setCurrentPage(1);
  };
  const contractTypeAndResetPage = (c: string) => {
    setContractTypeFilter(c);
    setCurrentPage(1);
  };
  const optionTypeAndResetPage = (o: string) => {
    setOptionTypeFilter(o);
    setCurrentPage(1);
  };
  const brokerAndResetPage = (b: string) => {
    setBrokerFilter(b);
    setCurrentPage(1);
  };

  return (
    <div className="p-3 sm:p-5 pb-20 space-y-2 max-w-7xl mx-auto w-full min-w-0">
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <h1 className="text-lg sm:text-xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
          Futures & Options (FnO)
        </h1>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <ImportWizardDialog
            brokerAccounts={brokerAccounts}
            trigger={
              <Button variant="outline" size="sm">
                <Download className="w-3.5 h-3.5" />
                Import Statement
              </Button>
            }
            onSuccess={handleRefresh}
          />
          <CreateFnoTradeDialog
            brokerAccounts={brokerAccounts}
            onSuccess={handleRefresh}
          />
        </div>
      </div>

      {/* Merged Single Summary Card */}
      <FnoSummaryCards metrics={metrics} />

      {/* Page Action Bar (Desktop) */}
      <Card className="hidden md:block border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-2.5 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
          <FnoFilterBar
            search={search}
            setSearch={searchAndResetPage}
            contractTypeFilter={contractTypeFilter}
            setContractTypeFilter={contractTypeAndResetPage}
            optionTypeFilter={optionTypeFilter}
            setOptionTypeFilter={optionTypeAndResetPage}
            brokerFilter={brokerFilter}
            setBrokerFilter={brokerAndResetPage}
            brokerAccounts={brokerAccounts}
            hasActiveFilters={hasActiveFilters}
            clearFilters={clearFilters}
          />

          {/* Action Bar Pagination */}
          {sortedTrades.length > 0 && (
            <div className="shrink-0 pt-1 md:pt-0 border-t md:border-t-0 border-slate-100 dark:border-slate-800">
              <TablePagination
                page={{
                  number: pageClamped - 1,
                  size: pageSize,
                  totalElements: sortedTrades.length,
                  totalPages: totalPages,
                }}
                onPageChange={(p) => setCurrentPage(p + 1)}
                onSizeChange={(s) => {
                  setPageSize(s);
                  setCurrentPage(1);
                }}
                unit="trade"
              />
            </div>
          )}
        </div>
      </Card>

      {/* Mobile PageActionBar Slot Integration */}
      <PageActionBar>
        <div className="flex flex-col gap-1.5 w-full text-xs">
          <FnoFilterBar
            search={search}
            setSearch={searchAndResetPage}
            contractTypeFilter={contractTypeFilter}
            setContractTypeFilter={contractTypeAndResetPage}
            optionTypeFilter={optionTypeFilter}
            setOptionTypeFilter={optionTypeAndResetPage}
            brokerFilter={brokerFilter}
            setBrokerFilter={brokerAndResetPage}
            brokerAccounts={brokerAccounts}
            hasActiveFilters={hasActiveFilters}
            clearFilters={clearFilters}
            isMobile
          />

          {sortedTrades.length > 0 && (
            <TablePagination
              page={{
                number: pageClamped - 1,
                size: pageSize,
                totalElements: sortedTrades.length,
                totalPages: totalPages,
              }}
              onPageChange={(p) => setCurrentPage(p + 1)}
              onSizeChange={(s) => {
                setPageSize(s);
                setCurrentPage(1);
              }}
              unit="trade"
              className="w-full px-0.5 pt-0.5"
            />
          )}
        </div>
      </PageActionBar>

      {/* Main Trade Content Area */}
      {paginatedTrades.length === 0 ? (
        <Card className="border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 rounded-xl p-8 text-center shadow-sm">
          <div className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-2">
            <Activity className="w-5 h-5" />
          </div>
          {hasActiveFilters ? (
            <div>
              <p className="text-xs font-semibold text-slate-900 dark:text-white">
                No trades match active filters
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                Try clearing filters or search keyword.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={clearFilters}
                className="mt-2"
              >
                Clear Filters
              </Button>
            </div>
          ) : (
            <div>
              <p className="text-xs font-semibold text-slate-900 dark:text-white">
                No FnO trades recorded yet
              </p>
              <p className="text-xs text-slate-500 mt-0.5 max-w-xs mx-auto">
                Log F&O trades manually or import broker Tax P&L statements.
              </p>
            </div>
          )}
        </Card>
      ) : (
        <>
          <FnoMobileCards
            trades={paginatedTrades}
            brokerAccounts={brokerAccounts}
            onRefresh={handleRefresh}
            onSelectDeleteTrade={setDeletingTrade}
            getBrokerName={getBrokerName}
          />

          <FnoDesktopTable
            trades={paginatedTrades}
            brokerAccounts={brokerAccounts}
            onRefresh={handleRefresh}
            onSelectDeleteTrade={setDeletingTrade}
            getBrokerName={getBrokerName}
            onToggleSort={toggleSort}
          />
        </>
      )}

      {/* Delete Confirmation Dialog */}
      <DeleteFnoTradeDialog
        deletingTrade={deletingTrade}
        onClose={() => setDeletingTrade(null)}
        isDeleting={isDeleting}
        onConfirmDelete={handleDeleteConfirm}
      />
    </div>
  );
}

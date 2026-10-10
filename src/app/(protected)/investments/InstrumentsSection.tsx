'use client';

import { Layers, Plus } from 'lucide-react';

import { PageActionBar } from '@/components/layout/PageActionBarContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

import { CreateInstrumentDialog } from './CreateInstrumentDialog';
import { InstrumentsFilterBar } from './instruments-section/InstrumentsFilterBar';
import { InstrumentsMobileCards } from './instruments-section/InstrumentsMobileCards';
import { InstrumentsTable } from './instruments-section/InstrumentsTable';
import { useInstrumentsSection } from './instruments-section/useInstrumentsSection';

export function InstrumentsSection() {
  const {
    instruments,
    totalElements,
    totalPages,
    isLoading,
    isFetching,
    isError,
    page,
    setPage,
    pageSize,
    setPageSize,
    sortDir,
    toggleSort,
    typeFilter,
    search,
    handleSearchChange,
    handleTypeFilterChange,
    catalogEmpty,
  } = useInstrumentsSection();

  return (
    <div className="space-y-2 pb-32">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            {totalElements === undefined ? 'Instruments' : `Instruments (${totalElements.toLocaleString('en-IN')})`}
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Tracked stocks, ETFs, mutual funds, ISIN codes, and exchange tickers
          </p>
        </div>
      </div>

      {/* Desktop Action Bar Container */}
      <Card className="hidden lg:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl p-3">
        <InstrumentsFilterBar
          search={search}
          onSearchChange={handleSearchChange}
          typeFilter={typeFilter}
          onTypeFilterChange={handleTypeFilterChange}
          sortDir={sortDir}
          toggleSort={toggleSort}
          currentPage={page}
          pageSize={pageSize}
          totalPages={totalPages}
          loading={isFetching}
          onPageChange={setPage}
          onSizeChange={setPageSize}
        />
      </Card>

      {/* Mobile PageActionBar Integration */}
      <PageActionBar>
        <InstrumentsFilterBar
          search={search}
          onSearchChange={handleSearchChange}
          typeFilter={typeFilter}
          onTypeFilterChange={handleTypeFilterChange}
          sortDir={sortDir}
          toggleSort={toggleSort}
          currentPage={page}
          pageSize={pageSize}
          totalPages={totalPages}
          loading={isFetching}
          onPageChange={setPage}
          onSizeChange={setPageSize}
          isMobile
        />
      </PageActionBar>

      {/* Main Instrument Cards Display */}
      {isLoading ? (
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm rounded-xl p-8 text-center text-xs text-slate-500">
          Loading instruments…
        </Card>
      ) : isError ? (
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm rounded-xl p-8 text-center text-xs text-rose-600 dark:text-rose-400">
          Couldn&apos;t load instruments. Try again.
        </Card>
      ) : catalogEmpty ? (
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm rounded-xl p-8 text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-blue-50 dark:bg-blue-950/50 flex items-center justify-center mx-auto text-blue-600 dark:text-blue-400">
            <Layers className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
              No instruments recorded yet
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Add stocks, mutual funds, ETFs, and other assets to build your
              master registry and track market prices.
            </p>
          </div>
          <CreateInstrumentDialog
            trigger={
              <Button size="sm" variant="blue" className="mt-2">
                <Plus className="w-3.5 h-3.5" />
                <span>Add First Instrument</span>
              </Button>
            }
          />
        </Card>
      ) : instruments.length === 0 ? (
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm rounded-xl p-8 text-center text-xs text-slate-500">
          {page > 0 ? 'No more instruments.' : 'No instruments match your search or filter.'}
        </Card>
      ) : (
        <>
          <InstrumentsMobileCards pagedInstruments={instruments} />
          <InstrumentsTable pagedInstruments={instruments} />
        </>
      )}
    </div>
  );
}

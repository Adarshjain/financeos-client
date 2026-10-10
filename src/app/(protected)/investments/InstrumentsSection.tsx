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
    isLoading,
    isFetching,
    isError,
    page,
    setPage,
    pageSize,
    setPageSize,
    hasPrev,
    hasNext,
    typeFilter,
    search,
    handleSearchChange,
    handleTypeFilterChange,
    catalogEmpty,
  } = useInstrumentsSection();

  return (
    <div className="space-y-2 pb-32">
      {/* Desktop Action Bar Container */}
      <Card className="hidden lg:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl p-3">
        <InstrumentsFilterBar
          search={search}
          onSearchChange={handleSearchChange}
          typeFilter={typeFilter}
          onTypeFilterChange={handleTypeFilterChange}
          currentPage={page}
          pageSize={pageSize}
          hasPrev={hasPrev}
          hasNext={hasNext}
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
          currentPage={page}
          pageSize={pageSize}
          hasPrev={hasPrev}
          hasNext={hasNext}
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

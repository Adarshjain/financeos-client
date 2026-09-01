'use client';

import { Layers, Plus } from 'lucide-react';

import { PageActionBar } from '@/components/layout/PageActionBarContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Instrument } from '@/lib/types';

import { CreateInstrumentDialog } from './CreateInstrumentDialog';
import { InstrumentsFilterBar } from './instruments-section/InstrumentsFilterBar';
import { InstrumentsMobileCards } from './instruments-section/InstrumentsMobileCards';
import { InstrumentsTable } from './instruments-section/InstrumentsTable';
import { useInstrumentsSection } from './instruments-section/useInstrumentsSection';

interface InstrumentsSectionProps {
  instruments: Instrument[];
}

export function InstrumentsSection({ instruments }: InstrumentsSectionProps) {
  const {
    setPage,
    pageSize,
    setPageSize,
    sortOrder,
    typeFilter,
    search,
    handleSearchChange,
    handleTypeFilterChange,
    toggleSort,
    totalElements,
    totalPages,
    currentPage,
    sortedInstruments,
    pagedInstruments,
  } = useInstrumentsSection({
    instruments,
  });

  return (
    <div className="space-y-2 pb-32">
      {/* Desktop Action Bar Container */}
      <Card className="hidden lg:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl p-3">
        <InstrumentsFilterBar
          search={search}
          onSearchChange={handleSearchChange}
          typeFilter={typeFilter}
          onTypeFilterChange={handleTypeFilterChange}
          sortOrder={sortOrder}
          toggleSort={toggleSort}
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
        <InstrumentsFilterBar
          search={search}
          onSearchChange={handleSearchChange}
          typeFilter={typeFilter}
          onTypeFilterChange={handleTypeFilterChange}
          sortOrder={sortOrder}
          toggleSort={toggleSort}
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

      {/* Main Instrument Cards Display */}
      {instruments.length === 0 ? (
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
      ) : sortedInstruments.length === 0 ? (
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm rounded-xl p-8 text-center text-xs text-slate-500">
          No instruments match your search or filter.
        </Card>
      ) : (
        <>
          <InstrumentsMobileCards pagedInstruments={pagedInstruments} />
          <InstrumentsTable pagedInstruments={pagedInstruments} />
        </>
      )}
    </div>
  );
}

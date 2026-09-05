'use client';

import { Layers, Plus } from 'lucide-react';

import { PageActionBar } from '@/components/layout/PageActionBarContext';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

import { CorporateActionsFilterBar } from './corporate-actions-section/CorporateActionsFilterBar';
import { CorporateActionsMobileCards } from './corporate-actions-section/CorporateActionsMobileCards';
import { CorporateActionsTable } from './corporate-actions-section/CorporateActionsTable';
import { useCorporateActionsSection } from './corporate-actions-section/useCorporateActionsSection';
import { CorporateActionsDialog } from './CorporateActionsDialog';

export function CorporateActionsSection() {
  const {
    corporateActions,
    search,
    typeFilter,
    setTypeFilter,
    sortOrder,
    deletingId,
    activeDialogInstrument,
    activeEditAction,
    dialogOpen,
    setDialogOpen,
    handleSearchChange,
    handleDelete,
    toggleSort,
    instrumentMap,
    sortedActions,
    openCreateDialog,
    openEditDialog,
  } = useCorporateActionsSection();

  return (
    <div className="space-y-2 pb-32">
      {/* Desktop Action Bar Container */}
      <Card className="hidden lg:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl p-3">
        <CorporateActionsFilterBar
          search={search}
          onSearchChange={handleSearchChange}
          typeFilter={typeFilter}
          setTypeFilter={setTypeFilter}
          sortOrder={sortOrder}
          toggleSort={toggleSort}
          openCreateDialog={openCreateDialog}
        />
      </Card>

      {/* Mobile PageActionBar Integration */}
      <PageActionBar>
        <CorporateActionsFilterBar
          search={search}
          onSearchChange={handleSearchChange}
          typeFilter={typeFilter}
          setTypeFilter={setTypeFilter}
          sortOrder={sortOrder}
          toggleSort={toggleSort}
          openCreateDialog={openCreateDialog}
          isMobile
        />
      </PageActionBar>

      {/* Main Corporate Action Cards Display */}
      {corporateActions.length === 0 ? (
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm rounded-xl p-8 text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center mx-auto text-purple-600 dark:text-purple-400">
            <Layers className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="text-base font-bold text-slate-800 dark:text-slate-200">
              No corporate actions recorded yet
            </h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              Record stock splits, bonus share issues, demergers, and mergers to
              automatically adjust holding positions and cost bases.
            </p>
          </div>
          <Button
            size="sm"
            variant="purple"
            onClick={openCreateDialog}
            className="mt-2"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Record First Action</span>
          </Button>
        </Card>
      ) : sortedActions.length === 0 ? (
        <Card className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm rounded-xl p-8 text-center text-xs text-slate-500">
          No corporate actions match your filters.
        </Card>
      ) : (
        <>
          <CorporateActionsMobileCards
            sortedActions={sortedActions}
            instrumentMap={instrumentMap}
            openEditDialog={openEditDialog}
            handleDelete={handleDelete}
            deletingId={deletingId}
          />

          <CorporateActionsTable
            sortedActions={sortedActions}
            instrumentMap={instrumentMap}
            openEditDialog={openEditDialog}
            handleDelete={handleDelete}
            deletingId={deletingId}
          />
        </>
      )}

      {/*
        Driven entirely by the buttons above (Record Action / per-card Edit), so
        it renders no trigger of its own. The `key` remounts it whenever the
        target changes, which is what clears the previous action's form state
        when switching between editing and recording.
      */}
      <CorporateActionsDialog
        key={activeEditAction?.id ?? 'create'}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSuccess={() => setDialogOpen(false)}
        instrument={
          activeDialogInstrument
            ? {
                id: activeDialogInstrument.id,
                name: activeDialogInstrument.name,
                symbol: activeDialogInstrument.symbol ?? undefined,
              }
            : undefined
        }
        editAction={activeEditAction ?? undefined}
      />
    </div>
  );
}

'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import React from 'react';

import { Banner } from '@/components/ds/Banner/Banner';
import { GRID_GAP } from '@/components/ds/gridGap';
import type { DividendFilters } from '@/lib/investments.types';
import { useLazyDialog } from '@/lib/lazy/useLazyDialog';
import type { Dividend } from '@/lib/types';

import type { DividendPrefill } from './DividendFormDialog';
import { DividendsHero } from './DividendsFigures';
import { DividendsListCard } from './DividendsListCard';
import {
  type ByInstrumentRow,
  type DividendListRow,
  type DividendsFigures as FiguresModel,
  dividendsUrl,
  type DividendsUrlState,
  type FyOption,
  suggestionNote,
  suggestionRow,
  unrecordedBanner,
} from './dividendsModel';
import { ByInstrumentCard, dropSuggestions, SuggestionsCard } from './DividendsSideCards';
import { useUnrecordedCredits } from './useUnrecordedCredits';

const loadDividendForms = () => import('./DividendFormDialog');
const loadReconcileDialog = () => import('./DividendReconcileDialog').then((m) => m.DividendReconcileDialog);

export interface DividendsScreenProps {
  state: DividendsUrlState;
  figures: FiguresModel;
  /** The page's payouts, and the same rows ready to draw. */
  dividends: Dividend[];
  rows: DividendListRow[];
  totalElements: number;
  totalPages: number;
  fyOptions: FyOption[];
  fyValue: string;
  currentFy: number;
  brokers: { id: string; name: string }[];
  instrumentLabel: string | null;
  totalsLine: string | null;
  exportFilters: DividendFilters;
  byInstrument: { rows: ByInstrumentRow[]; page: number; totalElements: number; totalPages: number };
  today: string;
}

/** The Dividends tab: hero, the unrecorded-credits banner, the list, the by-instrument and suggestions cards, and the dialogs they open. */
export function DividendsScreen({
  state,
  figures,
  dividends,
  rows,
  totalElements,
  totalPages,
  fyOptions,
  fyValue,
  currentFy,
  brokers,
  instrumentLabel,
  totalsLine,
  exportFilters,
  byInstrument,
  today,
}: DividendsScreenProps) {
  const router = useRouter();
  const [opened, setOpened] = React.useState<Dividend | null>(null);
  const [recording, setRecording] = React.useState<{ prefill: DividendPrefill; suggestionKey?: string } | null>(null);
  const [reconciling, setReconciling] = React.useState(false);
  // The dividend forms and Reconcile are not in the page: each loads when opened (see useLazyDialog).
  const { Component: forms, run: runForms } = useLazyDialog(loadDividendForms);
  const { Component: DividendReconcileDialog, run: runReconcile } = useLazyDialog(loadReconcileDialog);

  const unrecorded = useUnrecordedCredits();
  const { scan } = unrecorded;
  React.useEffect(() => {
    void scan();
  }, [scan]);

  // The dialog keeps the payout it was opened on, and follows its fresh row while the page still lists it.
  const editing = opened ? (dividends.find((d) => d.id === opened.id) ?? opened) : null;
  const afterChange = () => void scan();
  const brokerAccountId = state.broker || undefined;
  const qc = useQueryClient();
  const banner = unrecordedBanner(unrecorded.items);

  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-16">
      <DividendsHero figures={figures} />
      {banner ? (
        <Banner tone="warning" title={banner.title} action={{ label: 'Reconcile', onSelect: () => void runReconcile(() => setReconciling(true)) }}>
          {banner.detail}
        </Banner>
      ) : null}
      <DividendsListCard
        state={state}
        rows={rows}
        totalElements={totalElements}
        totalPages={totalPages}
        fyOptions={fyOptions}
        fyValue={fyValue}
        currentFy={currentFy}
        brokers={brokers}
        instrumentLabel={instrumentLabel}
        totalsLine={totalsLine}
        exportFilters={exportFilters}
        onEdit={(id) => {
          const next = dividends.find((d) => d.id === id) ?? null;
          if (next) void runForms(() => setOpened(next));
          else setOpened(null);
        }}
      />
      <div className={`grid grid-cols-1 desk:grid-cols-2 items-start ${GRID_GAP}`}>
        <ByInstrumentCard
          {...byInstrument}
          onPageChange={(ipage) => router.push(dividendsUrl({ ...state, ipage }), { scroll: false })}
        />
        <SuggestionsCard
          brokerAccountId={brokerAccountId}
          onRecord={(s) => {
            const row = suggestionRow(s);
            void runForms(() => setRecording({
              suggestionKey: row.key,
              prefill: {
                brokerAccountId: s.brokerAccountId,
                instrumentId: s.instrumentId,
                perUnit: Number(s.perUnit),
                amount: Number(s.estimatedAmount),
                exDate: s.exDate,
                payDate: s.exDate,
                notes: suggestionNote(s),
              },
            }));
          }}
        />
      </div>

      {editing && forms ? <forms.DividendEditDialog dividend={editing} onClose={() => setOpened(null)} onChanged={afterChange} /> : null}
      {reconciling && DividendReconcileDialog ? (
        <DividendReconcileDialog
          unrecorded={unrecorded}
          today={today}
          onRecord={(prefill) => void runForms(() => setRecording({ prefill }))}
          onChanged={() => {
            router.refresh();
            afterChange();
          }}
          onClose={() => setReconciling(false)}
        />
      ) : null}
      {recording && forms ? (
        <forms.DividendAddDialog
          prefill={recording.prefill}
          onSaved={() => {
            if (recording.suggestionKey) dropSuggestions(qc, brokerAccountId, [recording.suggestionKey]);
            afterChange();
          }}
          onClose={() => setRecording(null)}
        />
      ) : null}
    </div>
  );
}

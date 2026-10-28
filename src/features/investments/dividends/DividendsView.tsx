'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import React from 'react';

import { Banner } from '@/components/ds';
import type { DividendFilters } from '@/lib/investments.types';
import type { Dividend } from '@/lib/types';

import { DividendAddDialog, DividendEditDialog, type DividendPrefill } from './DividendFormDialog';
import { DividendReconcileDialog } from './DividendReconcileDialog';
import { DividendsHero, DividendsTiles } from './DividendsFigures';
import { DividendsListCard } from './DividendsListCard';
import {
  type ByInstrumentRow,
  type DividendListRow,
  type DividendsFigures as FiguresModel,
  dividendsTiles,
  dividendsUrl,
  type DividendsUrlState,
  type FyOption,
  suggestionNote,
  suggestionRow,
  unrecordedBanner,
} from './dividendsModel';
import { ByInstrumentCard, dropSuggestions, SuggestionsCard } from './DividendsSideCards';
import { useUnrecordedCredits } from './useUnrecordedCredits';

export interface DividendsViewProps {
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

/** The Dividends tab: figures, the unrecorded-credits banner, the list, the by-instrument and suggestions cards, and the dialogs they open. */
export function DividendsView({
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
}: DividendsViewProps) {
  const router = useRouter();
  const [opened, setOpened] = React.useState<Dividend | null>(null);
  const [recording, setRecording] = React.useState<{ prefill: DividendPrefill; suggestionKey?: string } | null>(null);
  const [reconciling, setReconciling] = React.useState(false);

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
      <DividendsTiles tiles={dividendsTiles(figures)} />
      {banner ? (
        <Banner tone="warning" title={banner.title} action={{ label: 'Reconcile', onSelect: () => setReconciling(true) }}>
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
        onEdit={(id) => setOpened(dividends.find((d) => d.id === id) ?? null)}
      />
      <div className="grid grid-cols-1 desk:grid-cols-2 items-start gap-x-space-12 gap-y-space-8 desk:gap-space-16">
        <ByInstrumentCard
          {...byInstrument}
          onPageChange={(ipage) => router.push(dividendsUrl({ ...state, ipage }), { scroll: false })}
        />
        <SuggestionsCard
          brokerAccountId={brokerAccountId}
          onRecord={(s) => {
            const row = suggestionRow(s);
            setRecording({
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
            });
          }}
        />
      </div>

      {editing ? <DividendEditDialog dividend={editing} onClose={() => setOpened(null)} onChanged={afterChange} /> : null}
      {reconciling ? (
        <DividendReconcileDialog
          unrecorded={unrecorded}
          today={today}
          onRecord={(prefill) => setRecording({ prefill })}
          onChanged={() => {
            router.refresh();
            afterChange();
          }}
          onClose={() => setReconciling(false)}
        />
      ) : null}
      {recording ? (
        <DividendAddDialog
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

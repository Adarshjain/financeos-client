'use client';

import React from 'react';

import {
  Card,
  EmptyState,
  GRID_GAP,
} from '@/components/ds';

import { EpfAddDialog } from './EpfAddDialog';
import { EpfEmployerDialog } from './EpfEmployerDialog';
import { EpfEntryDialog } from './EpfEntryDialog';
import { EpfHero } from './EpfFigures';
import {
  type EpfEmployer,
  type EpfEmployerRow,
  type EpfEntry,
  type EpfFigures,
  type EpfLatestContribution,
  type EpfRow,
  type EpfSummary,
  type EpfUrlState,
} from './epfModel';
import { EPF_UPLOAD_HREF, EpfPassbookCard } from './EpfPassbookCard';
import { EpfEmployersCard, EpfPensionCard } from './EpfSideCards';

export interface EpfScreenProps {
  state: EpfUrlState;
  summary: EpfSummary;
  figures: EpfFigures;
  /** The page's entries, and the same rows ready to draw. */
  entries: EpfEntry[];
  rows: EpfRow[];
  totalElements: number;
  totalPages: number;
  subtitle: string;
  fyOptions: { value: string; label: string }[];
  fyValue: string;
  employers: EpfEmployer[];
  employerRows: EpfEmployerRow[];
  /** The employer choices, empty unless there is more than one employer. */
  employerOptions: { value: string; label: string }[];
  employerValue: string;
  stale: { through: string; missing: string } | null;
  latestContribution: EpfLatestContribution | null;
}

/** The EPF tab: the hero, the passbook, the employers and the pension card, and the dialogs they open. */
export function EpfScreen({
  state,
  summary,
  figures,
  entries,
  rows,
  totalElements,
  totalPages,
  subtitle,
  fyOptions,
  fyValue,
  employers,
  employerRows,
  employerOptions,
  employerValue,
  stale,
  latestContribution,
}: EpfScreenProps) {
  const [opened, setOpened] = React.useState<EpfEntry | null>(null);
  const [adding, setAdding] = React.useState(false);
  const [employer, setEmployer] = React.useState<EpfEmployer | 'new' | null>(
    null
  );

  // The dialog keeps the entry it was opened on, and follows its fresh row while the page still lists it.
  const open = opened
    ? (entries.find((e) => e.id === opened.id) ?? opened)
    : null;

  // Add entry sits outside both layouts, so adding the first employer (which ends the empty state) keeps it open.
  const addDialog = adding ? (
    <EpfAddDialog
      initialType="OPENING_BALANCE"
      onClose={() => setAdding(false)}
    />
  ) : null;

  if (!summary.hasData) {
    return (
      <>
        <Card>
          <EmptyState
            title="No EPF yet"
            description="Upload your EPFO passbook to bring in every contribution and interest credit, or add your balance by hand."
            action={{
              label: 'Upload passbook',
              variant: 'primary',
              href: EPF_UPLOAD_HREF,
            }}
            secondaryAction={{
              label: 'Add opening balance',
              onSelect: () => setAdding(true),
            }}
          />
        </Card>
        {addDialog}
      </>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-space-8 desk:gap-space-16">
        <EpfHero figures={figures} />
        <div className={`grid grid-cols-1 desk:grid-cols-3 items-start ${GRID_GAP}`}>
          <div className="desk:col-span-2 min-w-0">
            <EpfPassbookCard
              state={state}
              rows={rows}
              totalElements={totalElements}
              totalPages={totalPages}
              subtitle={subtitle}
              fyOptions={fyOptions}
              fyValue={fyValue}
              employerOptions={employerOptions}
              employerValue={employerValue}
              stale={stale}
              onOpen={(id) =>
                setOpened(entries.find((e) => e.id === id) ?? null)
              }
            />
          </div>
          <div className="flex flex-col gap-space-8 desk:gap-space-16">
            <EpfEmployersCard
              rows={employerRows}
              onAdd={() => setEmployer('new')}
              onEdit={(id) =>
                setEmployer(employers.find((e) => e.id === id) ?? null)
              }
            />
            {summary.pension ? (
              <EpfPensionCard pension={summary.pension} />
            ) : null}
          </div>
        </div>

        {open ? (
          <EpfEntryDialog
            entry={open}
            employers={employers}
            latestContribution={latestContribution}
            onClose={() => setOpened(null)}
          />
        ) : null}
        {employer ? (
          <EpfEmployerDialog
            employer={employer === 'new' ? null : employer}
            onClose={() => setEmployer(null)}
          />
        ) : null}
      </div>
      {addDialog}
    </>
  );
}

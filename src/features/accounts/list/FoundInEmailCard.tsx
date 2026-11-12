'use client';

import React from 'react';

import { Card } from '@/components/ds/Card/Card';
import { DataTable } from '@/components/ds/DataTable/DataTable';
import { createDataTableColumnHelper } from '@/components/ds/DataTable/types';
import { SectionHeader } from '@/components/ds/SectionHeader/SectionHeader';
import { Text } from '@/components/ds/Text/Text';
import { BankLogo } from '@/components/organisms/BankLogo/BankLogo';

import { ClosedToggleButton, NameCell, useSectionBands } from './AccountsSections';
import { SuggestionActionsProvider, SuggestionButtons, useSuggestionActions } from './SuggestionRows';
import {
  FOUND_NOTE_COPY,
  foundBandLabel,
  foundRowSub,
  maybeBandLabel,
  olderBandLabel,
  olderBandSection,
  type SectionSuggestions,
  seenInEmailsLine,
  type SuggestionRow,
} from './suggestionsModel';

const ch = createDataTableColumnHelper<SuggestionRow>();
const columns = [
  ch.display({
    id: 'account',
    header: 'Account',
    meta: { size: 'fill', grow: 2, phone: 'main', wrap: true },
    cell: ({ row }) => {
      const seen = seenInEmailsLine(row.original.item);
      return (
        <div className="flex flex-col min-w-0">
          <NameCell name={row.original.name} sub={foundRowSub(row.original)} />
          {seen ? (
            <Text variant="caption" tone="ink-3">
              {seen}
            </Text>
          ) : null}
        </div>
      );
    },
  }),
  ch.display({
    id: 'actions',
    header: '',
    meta: { size: 'lg', align: 'end', phone: 'hidden' },
    cell: ({ row }) => <SuggestionButtons row={row.original} />,
  }),
];

/**
 * Every email-found suggestion in one card of its own, right below the hero; the Bank and Card sections list only the
 * user's own accounts. Found rows show; Older and Maybe stay collapsible bands inside it.
 */
export function FoundInEmailCard({ suggestions }: { suggestions: SectionSuggestions }) {
  const { bands } = suggestions;
  const toggles = useSectionBands();
  const actions = useSuggestionActions(suggestions.parents, suggestions.accounts ?? []);
  const olderSection = olderBandSection(bands.older);
  const table = (data: SuggestionRow[]) => (
    <DataTable
      columns={columns}
      data={data}
      getRowId={(row) => row.id}
      rowState={() => ({ pressable: false })}
      hideHeader
      leading={(r) => <BankLogo bankId={r.bankId} name={r.name} />}
      phoneActions={(row) => <SuggestionButtons row={row} />}
    />
  );
  return (
    <Card data-testid="found-in-email">
      <Card.Header>
        <div className="min-w-0">
          <Card.Title>{foundBandLabel(bands.found.length)}</Card.Title>
          <Card.Subtitle truncate={false}>{FOUND_NOTE_COPY}</Card.Subtitle>
        </div>
      </Card.Header>
      <SuggestionActionsProvider value={actions}>
        {table(bands.found)}
        {bands.older.length > 0 && (
          <>
            <SectionHeader
              variant="band"
              action={<ClosedToggleButton showing={toggles.older.showing} onToggle={toggles.older.toggle} />}
            >
              {olderBandLabel(olderSection, bands.older.length)}
            </SectionHeader>
            {toggles.older.showing && table(bands.older)}
          </>
        )}
        {bands.maybe.length > 0 && (
          <>
            <SectionHeader
              variant="band"
              action={<ClosedToggleButton showing={toggles.maybe.showing} onToggle={toggles.maybe.toggle} />}
            >
              {maybeBandLabel(bands.maybe.length)}
            </SectionHeader>
            {toggles.maybe.showing && table(bands.maybe)}
          </>
        )}
      </SuggestionActionsProvider>
      {actions.dialog}
    </Card>
  );
}

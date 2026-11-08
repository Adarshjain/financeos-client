'use client';

import React from 'react';

import { Card } from '@/components/ds/Card/Card';
import { DataTable } from '@/components/ds/DataTable/DataTable';
import { createDataTableColumnHelper } from '@/components/ds/DataTable/types';
import { BankLogo } from '@/components/organisms/BankLogo/BankLogo';

import { BandFooters, ClosedToggleButton, NameCell, useSectionBands } from './AccountsSections';
import { SuggestionActionsProvider, SuggestionButtons, useSuggestionActions } from './SuggestionRows';
import {
  FOUND_NOTE_COPY,
  foundBandLabel,
  foundRowSub,
  maybeBandLabel,
  olderBandLabel,
  olderBandSection,
  type SectionSuggestions,
  type SuggestionRow,
} from './suggestionsModel';

const ch = createDataTableColumnHelper<SuggestionRow>();
const columns = [
  ch.display({
    id: 'account',
    header: 'Account',
    meta: { size: 'fill', grow: 2, phone: 'main', wrap: true },
    cell: ({ row }) => <NameCell name={row.original.name} sub={foundRowSub(row.original)} />,
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
  const data = [
    ...bands.found,
    ...(toggles.older.showing ? bands.older : []),
    ...(toggles.maybe.showing ? bands.maybe : []),
  ];
  return (
    <Card data-testid="found-in-email">
      <Card.Header>
        <div className="min-w-0">
          <Card.Title>{foundBandLabel(bands.found.length)}</Card.Title>
          <Card.Subtitle truncate={false}>{FOUND_NOTE_COPY}</Card.Subtitle>
        </div>
      </Card.Header>
      <SuggestionActionsProvider value={actions}>
        <DataTable
          columns={columns}
          data={data}
          band={(row) => {
            if (row.band === 'OLDER') {
              return {
                key: 'older',
                label: olderBandLabel(olderSection, bands.older.length),
                action: <ClosedToggleButton showing onToggle={toggles.older.toggle} />,
              };
            }
            if (row.band === 'MAYBE') {
              return {
                key: 'maybe',
                label: maybeBandLabel(bands.maybe.length),
                action: <ClosedToggleButton showing onToggle={toggles.maybe.toggle} />,
              };
            }
            return null;
          }}
          getRowId={(row) => row.id}
          rowState={() => ({ pressable: false })}
          hideHeader
          leading={(r) => <BankLogo bankId={r.bankId} name={r.name} />}
          phoneActions={(row) => <SuggestionButtons row={row} />}
        />
      </SuggestionActionsProvider>
      <BandFooters section={olderSection} bands={bands} closedLine={null} toggles={toggles} />
      {actions.dialog}
    </Card>
  );
}

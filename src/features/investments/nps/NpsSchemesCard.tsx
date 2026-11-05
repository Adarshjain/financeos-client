'use client';

import React from 'react';

import { Card } from '@/components/ds/Card/Card';
import { Conceal } from '@/components/ds/Conceal/Conceal';
import { DataTable } from '@/components/ds/DataTable/DataTable';
import { createDataTableColumnHelper } from '@/components/ds/DataTable/types';
import { Text } from '@/components/ds/Text/Text';

import type { NpsSchemeRow, NpsTierGroup } from './npsModel';

const ch = createDataTableColumnHelper<NpsSchemeRow>();

const columns = [
  ch.display({
    id: 'scheme',
    header: 'Scheme',
    meta: { size: 'fill', grow: 2, phone: 'main' },
    cell: ({ row }) => (
      <div className="flex min-w-0 flex-col">
        <Text variant="body-strong" as="div" truncate>
          {row.original.name}
        </Text>
        <Text variant="label" tone="ink-3" as="div" truncate>
          {row.original.subtitle}
        </Text>
      </div>
    ),
  }),
  ch.display({ id: 'target', header: 'Target', meta: { size: 'xs', align: 'end', phone: 'hidden' }, cell: ({ row }) => <Text variant="body">{row.original.target}</Text> }),
  ch.display({ id: 'units', header: 'Units', meta: { size: 'md', align: 'end', phone: 'hidden' }, cell: ({ row }) => <Text variant="body">{row.original.units}</Text> }),
  ch.display({ id: 'nav', header: 'NAV', meta: { size: 'sm', align: 'end', phone: 'hidden' }, cell: ({ row }) => <Text variant="body">{row.original.nav}</Text> }),
  ch.display({
    id: 'value',
    header: 'Value',
    meta: { size: 'md', align: 'end', phone: 'amount' },
    cell: ({ row }) => (
      <>
        <Text variant="body-strong" as="div">
          <Conceal whole>{row.original.value}</Conceal>
        </Text>
        <Text variant="caption" tone="ink-3" as="div" className="desk:hidden">
          {row.original.amountSub}
        </Text>
      </>
    ),
  }),
];

export interface NpsSchemesCardProps {
  groups: NpsTierGroup[];
  onOpen: (row: NpsSchemeRow) => void;
}

/** The schemes by tier; a row opens the scheme. */
export function NpsSchemesCard({ groups, onOpen }: NpsSchemesCardProps) {
  const rows = groups.flatMap((g) => g.rows);
  const titleOf = (tier: string) => groups.find((g) => g.tier === tier)?.title ?? '';
  return (
    <Card title="Schemes">
      <DataTable
        columns={columns}
        data={rows}
        getRowId={(row) => row.id}
        band={(row) => ({ key: row.tier, label: <Conceal>{titleOf(row.tier)}</Conceal> })}
        phoneSub={(row) => (
          <Text variant="label" tone="ink-3" as="div">
            <Conceal>{row.phoneSub}</Conceal>
          </Text>
        )}
        onRowSelect={onOpen}
        stickyHeader={false}
        size="sm"
      />
    </Card>
  );
}

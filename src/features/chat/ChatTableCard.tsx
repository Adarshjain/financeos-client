'use client';

import React from 'react';

import { Button } from '@/components/ds/Button/Button';
import { Card } from '@/components/ds/Card/Card';
import { DataTable } from '@/components/ds/DataTable/DataTable';
import { createDataTableColumnHelper } from '@/components/ds/DataTable/types';
import { Text } from '@/components/ds/Text/Text';
import { formatCount } from '@/lib/format';

import { formatAnswerCell, tableToTsv } from './answerModel';
import type { ChatTableBlock } from './chat.types';
import { copyText } from './copyText';

interface Row {
  id: string;
  cells: Record<string, string>;
}

const ch = createDataTableColumnHelper<Row>();

const isNumeric = (c: ChatTableBlock['columns'][number]) => c.align === 'right' || c.format === 'inr' || c.format === 'number';

/** One table block: a card with the title, row count, a Copy table link and the rows. */
export function ChatTableCard({ table }: { table: ChatTableBlock }) {
  const { columns, rows } = table;
  const data = React.useMemo<Row[]>(
    () => rows.map((r, i) => ({ id: String(i), cells: Object.fromEntries(columns.map((c) => [c.key, formatAnswerCell(r[c.key], c.format)])) })),
    [rows, columns],
  );
  const tableColumns = React.useMemo(() => {
    const amountKey = columns.find(isNumeric)?.key;
    return columns.map((c, i) =>
      ch.display({
        id: c.key,
        header: c.label,
        meta: {
          size: i === 0 ? 'fill' : 'md',
          align: isNumeric(c) ? 'end' : 'start',
          phone: i === 0 ? 'main' : c.key === amountKey ? 'amount' : 'hidden',
        },
        cell: ({ row }) => (
          <Text variant={i === 0 ? 'body-strong' : 'body'} truncate>
            {row.original.cells[c.key]}
          </Text>
        ),
      }),
    );
  }, [columns]);

  const phoneSub = (row: Row) => {
    const amountKey = columns.find(isNumeric)?.key;
    return columns
      .slice(1)
      .filter((c) => c.key !== amountKey)
      .map((c) => `${c.label} ${row.cells[c.key]}`)
      .join(' · ');
  };

  const copy = () => {
    void copyText(tableToTsv(table), 'Table copied');
  };

  return (
    <Card
      title={table.title}
      subtitle={formatCount(rows.length, ['row', 'rows'])}
      action={
        <Text variant="label" as="span">
          <Button variant="link" size="sm" onClick={copy}>
            Copy table
          </Button>
        </Text>
      }
    >
      <DataTable columns={tableColumns} data={data} getRowId={(row) => row.id} phoneSub={phoneSub} sortMode="client" />
    </Card>
  );
}

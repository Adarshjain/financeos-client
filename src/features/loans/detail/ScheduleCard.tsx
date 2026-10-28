'use client';

import React from 'react';

import { Button, Card, Conceal, createDataTableColumnHelper, DataTable, EmptyState, FilterChip, Select, StatusWord, Text } from '@/components/ds';
import type { InstallmentDto } from '@/lib/loan.types';

import { fyOptions, fySummaryLine, type ScheduleRow } from './scheduleModel';

const helper = createDataTableColumnHelper<ScheduleRow>();

/** The overdue row's Mark paid sits inside the pressable row: its own press must not also open the row's. */
function OverdueAction({ row, onMarkPaid }: { row: ScheduleRow; onMarkPaid: (inst: InstallmentDto) => void }) {
  if (!row.overdue) return null;
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  return (
    <div className="mt-space-4" onPointerDown={stop} onPointerUp={stop} onClick={stop} onKeyDown={stop}>
      <Button variant="primary" size="sm" onClick={() => onMarkPaid(row.installment)}>
        Mark paid
      </Button>
    </div>
  );
}

/** "interest 10,000 · principal 4,347": the two bare amounts hide with the others. */
export function PhoneSub({ text }: { text: string }) {
  const match = /^interest ([-−]?[\d,.]+) · principal ([-−]?[\d,.]+)$/.exec(text);
  if (!match) return <>{text}</>;
  return (
    <>
      interest <Conceal whole>{match[1]}</Conceal> · principal <Conceal whole>{match[2]}</Conceal>
    </>
  );
}

function columnsFor(onMarkPaid: (inst: InstallmentDto) => void) {
  return helper.columns([
    helper.accessor('seq', { id: 'seq', header: '#', meta: { size: 'sm', phone: 'hidden' } }),
    helper.display({
      id: 'due',
      header: 'Due',
      meta: { size: 'sm', phone: 'main' },
      cell: ({ row }) => (
        <>
          {row.original.due}
          <Text as="span" tone="ink-3" className="desk:hidden">{` · #${row.original.seq}`}</Text>
        </>
      ),
    }),
    helper.accessor('opening', { id: 'opening', header: 'Opening', meta: { size: 'sm', align: 'end', phone: 'hidden' }, cell: ({ getValue }) => <Conceal whole>{getValue()}</Conceal> }),
    helper.accessor('emi', { id: 'emi', header: 'EMI', meta: { size: 'sm', align: 'end', phone: 'amount' }, cell: ({ getValue }) => <Conceal whole>{getValue()}</Conceal> }),
    helper.accessor('interest', { id: 'interest', header: 'Interest', meta: { size: 'sm', align: 'end', phone: 'hidden' }, cell: ({ getValue }) => <Conceal whole>{getValue()}</Conceal> }),
    helper.accessor('principal', { id: 'principal', header: 'Principal', meta: { size: 'sm', align: 'end', phone: 'hidden' }, cell: ({ getValue }) => <Conceal whole>{getValue()}</Conceal> }),
    helper.accessor('closing', { id: 'closing', header: 'Closing', meta: { size: 'sm', align: 'end', phone: 'hidden' }, cell: ({ getValue }) => <Conceal whole>{getValue()}</Conceal> }),
    helper.display({
      id: 'status',
      header: 'Status',
      meta: { size: 'md', wrap: true, phone: 'status' },
      cell: ({ row }) => (
        <>
          <StatusWord tone={row.original.status.tone}>{row.original.status.label}</StatusWord>
          <OverdueAction row={row.original} onMarkPaid={onMarkPaid} />
        </>
      ),
    }),
  ]);
}

export interface ScheduleCardProps {
  rows: ScheduleRow[];
  installments: InstallmentDto[];
  /** The financial year shown (its starting calendar year, as text). */
  fy: string | null;
  onFyChange: (fy: string) => void;
  /** `?installment=N`: that EMI's row is highlighted and scrolled to. */
  highlightSeq: number | null;
  /** Mark paid: the overdue row's button. */
  onMarkPaid: (inst: InstallmentDto) => void;
  /** A pressed row: an unpaid one opens Mark paid, a linked paid one its EMI dialog. */
  onOpenRow: (row: ScheduleRow) => void;
}

/** The loan's EMIs for one financial year, with prepayments and rate changes as lines at their dates. */
export function ScheduleCard({ rows, installments, fy, onFyChange, highlightSeq, onMarkPaid, onOpenRow }: ScheduleCardProps) {
  const columns = React.useMemo(() => columnsFor(onMarkPaid), [onMarkPaid]);
  const options = fyOptions(installments);
  const shown = fy ? rows.filter((r) => r.fy === fy) : [];
  const selected = options.find((o) => o.value === fy);

  return (
    <Card
      title="Schedule"
      subtitle={fy ? fySummaryLine(installments, fy) : undefined}
      action={
        fy ? (
          <Select
            value={fy}
            options={options}
            onValueChange={(value) => onFyChange(value as string)}
            trigger={<FilterChip hasDropdown>{selected?.label ?? fy}</FilterChip>}
          />
        ) : undefined
      }
    >
      <DataTable
        columns={columns}
        data={shown}
        getRowId={(row) => row.id}
        band={(row) => row.band}
        onRowSelect={onOpenRow}
        rowState={(row) => ({ tone: row.overdue ? 'danger' : undefined, pressable: !row.settled || Boolean(row.payment) })}
        highlightedRowId={highlightSeq == null ? undefined : String(highlightSeq)}
        phoneSub={(row) => <PhoneSub text={row.phoneSub} />}
        empty={<EmptyState compact description="No schedule to show yet." />}
        stickyHeader={false}
      />
    </Card>
  );
}

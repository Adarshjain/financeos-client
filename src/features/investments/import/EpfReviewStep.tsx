'use client';

import React from 'react';

import { Badge, Banner, Button, Card, createDataTableColumnHelper, DataTable, Select, Text } from '@/components/ds';

import {
  countsLine,
  employerOptionsOf,
  employerSub,
  employerTitle,
  type EpfReviewRow,
  epfRow,
  PENSION_NOTE,
  statusTone,
  statusWord,
} from './epfImportModel';
import { MODE_OPTIONS } from './importModel';
import type { ImportMode } from './types';
import type { useEpfImport } from './useEpfImport';

const col = createDataTableColumnHelper<EpfReviewRow>();

const columns = [
  col.display({
    id: 'period',
    header: 'Wage month',
    meta: { size: 'md', phone: 'hidden' },
    cell: ({ row }) => <Text variant="body">{row.original.period}</Text>,
  }),
  col.display({
    id: 'particulars',
    header: 'Particulars',
    meta: { size: 'fill', grow: 1, wrap: true, phone: 'main' },
    cell: ({ row }) => (
      <>
        <Text variant="body-strong" as="div">
          {row.original.particulars}
        </Text>
        {row.original.detail ? (
          <Text variant="label" tone="ink-3" as="div">
            {row.original.detail}
          </Text>
        ) : null}
      </>
    ),
  }),
  col.display({
    id: 'amount',
    header: 'Amount',
    meta: { size: 'md', align: 'end', phone: 'amount' },
    cell: ({ row }) => <Text variant="body-strong">{row.original.amount}</Text>,
  }),
  col.display({
    id: 'status',
    header: 'Status',
    meta: { size: 'lg', phone: 'status' },
    cell: ({ row }) => (
      <Badge tone={statusTone(row.original.status)} variant="soft">
        {statusWord(row.original.status)}
      </Badge>
    ),
  }),
];

/** Step 2 for the EPFO passbook: the counts, the employer it files under, and every entry with what the import does to it. */
export function EpfReviewStep({ epf, mode, onModeChange }: { epf: ReturnType<typeof useEpfImport>; mode: ImportMode; onModeChange: (mode: ImportMode) => void }) {
  const { preview, choices, isCommitting, isPreviewing } = epf;
  const rows = React.useMemo(() => (preview ? preview.rows.map(epfRow) : []), [preview]);
  if (!preview) return null;
  const isNew = !preview.employer.existingId;
  const busy = isCommitting || isPreviewing;
  return (
    <div className="flex flex-col gap-space-12 desk:gap-space-16">
      <Card title="What are you importing?">
        <div className="flex flex-col gap-space-12 p-space-16 desk:p-space-20">
          <Select label="Type" options={MODE_OPTIONS} value={mode} onValueChange={(v) => onModeChange(v as ImportMode)} disabled={busy} />
          <div className="flex items-center justify-between gap-space-12">
            <Text variant="body-strong" as="span" className="min-w-0 break-all">
              {epf.file?.name}
            </Text>
            <Button type="button" variant="link" disabled={busy} onClick={() => epf.setStep(1)}>
              Change file
            </Button>
          </div>
          {isNew && !choices ? (
            <Banner tone="info">
              {`New employer in this passbook: ${preview.employer.name}${preview.employer.memberId ? ` (member ID …${preview.employer.memberId.slice(-5)})` : ''}. Importing adds it to your employers.`}
            </Banner>
          ) : (
            <Banner tone="info">{`${countsLine(preview)} ${PENSION_NOTE}`}</Banner>
          )}
          {choices ? (
            <Select label="Employer" options={employerOptionsOf(choices)} value={epf.employer} onValueChange={(v) => epf.changeEmployer(Array.isArray(v) ? (v[0] ?? '') : v)} disabled={busy} />
          ) : null}
          {preview.unrecognisedLines > 0 ? (
            <Banner tone="warning">{`${preview.unrecognisedLines} ${preview.unrecognisedLines === 1 ? 'line' : 'lines'} in the passbook could not be read and will not be imported.`}</Banner>
          ) : null}
        </div>
      </Card>
      <div className="flex flex-col gap-space-8">
        <div className="flex flex-col">
          <Text variant="title" as="h3">
            {employerTitle(preview)}
          </Text>
          <Text variant="label" tone="ink-3" as="p">
            {employerSub(preview)}
          </Text>
        </div>
        <Card>
          <DataTable
            columns={columns}
            data={rows}
            getRowId={(r) => r.id}
            rowState={(r) => ({ muted: r.status === 'EXISTS' })}
            phoneSub={(r) => (
              <Text variant="caption" tone="ink-3" as="span">
                {r.period}
              </Text>
            )}
            stickyHeader={false}
          />
        </Card>
      </div>
    </div>
  );
}

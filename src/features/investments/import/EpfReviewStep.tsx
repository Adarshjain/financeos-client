'use client';

import React from 'react';

import { Badge, Banner, Card, createDataTableColumnHelper, DataTable, Select, Text } from '@/components/ds';

import {
  countsLine,
  employerOptionsOf,
  employerSub,
  employerTitle,
  type EpfReviewRow,
  epfRow,
  type EpfSection,
  mismatchLine,
  NEW_EMPLOYER,
  PENSION_NOTE,
  refusedItem,
  statusTone,
  statusWord,
} from './epfImportModel';
import { MODE_OPTIONS } from './importModel';
import type { ImportMode } from './types';
import type { useEpfImport } from './useEpfImport';

const col = createDataTableColumnHelper<EpfReviewRow>();

const share = (value: string) => <Text variant="body">{value}</Text>;

/** Like the EPF passbook: one column per share on desktop; the phone shows the entry's total. */
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
        <div className="flex flex-wrap items-center gap-space-6">
          <Text variant="body-strong" as="span">
            {row.original.particulars}
          </Text>
          <Badge tone={statusTone(row.original.status)} variant="soft">
            {statusWord(row.original.status)}
          </Badge>
        </div>
        {row.original.detail ? (
          <Text variant="label" tone="ink-3" as="div">
            {row.original.detail}
          </Text>
        ) : null}
        {row.original.mismatch ? (
          <Text variant="label" tone="warning" as="div">
            {row.original.mismatch}
          </Text>
        ) : null}
      </>
    ),
  }),
  col.display({
    id: 'employee',
    header: 'Your share',
    meta: { size: 'sm', align: 'end', phone: 'hidden' },
    cell: ({ row }) => share(row.original.employee),
  }),
  col.display({
    id: 'employer',
    header: 'Employer',
    meta: { size: 'sm', align: 'end', phone: 'hidden' },
    cell: ({ row }) => share(row.original.employer),
  }),
  col.display({
    id: 'pension',
    header: 'Pension',
    meta: { size: 'sm', align: 'end', phone: 'hidden' },
    cell: ({ row }) => <Text variant="body" tone="ink-3">{row.original.pension}</Text>,
  }),
  col.display({
    id: 'amount',
    header: 'Total',
    meta: { size: 'md', align: 'end', phone: 'amount' },
    cell: ({ row }) => <Text variant="body-strong">{row.original.amount}</Text>,
  }),
];

/** One passbook group: its title, the counts, the employer it files under, and every entry with what the import does to it. */
function EpfSectionBlock({ epf, section }: { epf: ReturnType<typeof useEpfImport>; section: EpfSection }) {
  const { preview } = section;
  const choices = epf.choices[section.key];
  const rows = React.useMemo(() => preview.rows.map(epfRow), [preview]);
  const busy = epf.isCommitting || epf.isPreviewing;
  const isNew = !preview.employer.existingId;
  return (
    <div className="flex flex-col gap-space-8">
      <div className="flex flex-col">
        <Text variant="title" as="h3">
          {employerTitle(preview)}
        </Text>
        <Text variant="label" tone="ink-3" as="p">
          {employerSub(preview)}
        </Text>
        {section.fileNames.length > 1 ? (
          <Text variant="caption" tone="ink-3" as="p" className="break-all">
            {`From ${section.fileNames.join(', ')}`}
          </Text>
        ) : null}
      </div>
      <Card>
        <div className="flex flex-col gap-space-8 desk:gap-space-12 p-space-16 desk:p-space-20">
          {isNew && !choices ? (
            <Banner tone="info">
              {`New employer in this passbook: ${preview.employer.name}${preview.employer.memberId ? ` (member ID …${preview.employer.memberId.slice(-5)})` : ''}. Importing adds it to your employers.`}
            </Banner>
          ) : (
            <Banner tone="info">{`${countsLine(preview)} ${PENSION_NOTE}`}</Banner>
          )}
          {choices ? (
            <Select
              label="Employer"
              options={employerOptionsOf(choices)}
              value={preview.employer.existingId ?? NEW_EMPLOYER}
              onValueChange={(v) => epf.changeEmployer(section.key, Array.isArray(v) ? (v[0] ?? '') : v)}
              disabled={busy}
            />
          ) : null}
          {preview.unrecognisedLines > 0 ? (
            <Banner tone="warning">{`${preview.unrecognisedLines} ${preview.unrecognisedLines === 1 ? 'line' : 'lines'} in the passbook could not be read and will not be imported.`}</Banner>
          ) : null}
          {mismatchLine(preview) ? <Banner tone="warning">{mismatchLine(preview)}</Banner> : null}
        </div>
      </Card>
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
  );
}

/** Step 2 for the EPFO passbooks: the files that were not imported, then one block per employer and member ID. */
export function EpfReviewStep({ epf, mode, onModeChange }: { epf: ReturnType<typeof useEpfImport>; mode: ImportMode; onModeChange: (mode: ImportMode) => void }) {
  const { preview, isCommitting, isPreviewing } = epf;
  if (!preview) return null;
  const busy = isCommitting || isPreviewing;
  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-16">
      <Card title="What are you importing?">
        <div className="flex flex-col gap-space-8 desk:gap-space-12 p-space-16 desk:p-space-20">
          <Select label="Type" options={MODE_OPTIONS} value={mode} onValueChange={(v) => onModeChange(v as ImportMode)} disabled={busy} />
          {preview.refused.length > 0 ? (
            <Banner tone="warning">
              {preview.refused.map((r, i) => (
                <Text key={`${i}-${r.fileName}`} variant="body" as="div">{`Not imported: ${refusedItem(r)}`}</Text>
              ))}
            </Banner>
          ) : null}
        </div>
      </Card>
      {preview.sections.map((s) => (
        <EpfSectionBlock key={s.key} epf={epf} section={s} />
      ))}
    </div>
  );
}

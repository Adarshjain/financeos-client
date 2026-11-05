'use client';

import React from 'react';

import { Banner } from '@/components/ds/Banner/Banner';
import { Button } from '@/components/ds/Button/Button';
import { Card } from '@/components/ds/Card/Card';
import { Conceal } from '@/components/ds/Conceal/Conceal';
import { DataTable } from '@/components/ds/DataTable/DataTable';
import { createDataTableColumnHelper } from '@/components/ds/DataTable/types';
import { DropZone } from '@/components/ds/DropZone/DropZone';
import { ListRow } from '@/components/ds/ListRow/ListRow';
import { Select } from '@/components/ds/Select/Select';
import { Text } from '@/components/ds/Text/Text';
import { TextField } from '@/components/ds/TextField/TextField';

import {
  alreadyImported,
  fileState,
  firstRows,
  incompleteLine,
  needsPick,
  NPS_ACCEPT,
  type NpsImportFile,
  type NpsImportTotals,
  PASSWORD_HINT,
  previewRow,
  type PreviewRowView,
  resultLine,
  resultTitle,
  reviewLines,
  sectorOf,
  statementTitle,
} from '../nps/npsImportModel';
import { SECTOR_LABEL } from '../nps/npsModel';
import { MODE_OPTIONS, queuedFile } from './importModel';
import type { ImportMode } from './types';
import type { useNpsImport } from './useNpsImport';

type NpsImport = ReturnType<typeof useNpsImport>;

export const NPS_UPLOAD_FORM_ID = 'import-nps-form';

const TypeSelect = ({ mode, onModeChange, disabled }: { mode: ImportMode; onModeChange: (mode: ImportMode) => void; disabled: boolean }) => (
  <Select label="Type" options={MODE_OPTIONS} value={mode} onValueChange={(v) => onModeChange(v as ImportMode)} disabled={disabled} />
);

/** Step 1 for the NPS statement: the type, then the PDFs. */
export function NpsUploadStep({ nps, mode, onModeChange }: { nps: NpsImport; mode: ImportMode; onModeChange: (mode: ImportMode) => void }) {
  const { files, isPreviewing, queueError } = nps;
  return (
    <form
      id={NPS_UPLOAD_FORM_ID}
      onSubmit={(e) => {
        e.preventDefault();
        void nps.previewAll();
      }}
      className="flex flex-col gap-space-8 desk:gap-space-16"
    >
      <Card title="What are you importing?">
        <div className="flex flex-col gap-space-8 desk:gap-space-16 p-space-16 desk:p-space-20">
          <TypeSelect mode={mode} onModeChange={onModeChange} disabled={isPreviewing} />
          {queueError ? <Banner tone="danger">{queueError}</Banner> : null}
          <DropZone
            title="Drop your NPS statements"
            hint="Download them from your record keeper's site or the NPS app, or forward the emailed one. Add Tier I, Tier II and every year at once."
            buttonLabel="Choose files"
            multiple
            accept={NPS_ACCEPT}
            disabled={isPreviewing}
            data-testid="nps-zone"
            onFilesSelected={nps.addFiles}
            queuedFiles={files.map((f, i) => queuedFile(f.file, i))}
            onRemoveFile={(q) => {
              const file = files[Number(q.id.split('-')[0])];
              if (file) nps.removeFile(file.id);
            }}
          />
        </div>
      </Card>
    </form>
  );
}

const col = createDataTableColumnHelper<PreviewRowView>();

const columns = [
  col.display({ id: 'date', header: 'Date', meta: { size: 'md', phone: 'hidden' }, cell: ({ row }) => <Text variant="body">{row.original.date}</Text> }),
  col.display({
    id: 'entry',
    header: 'Entry',
    meta: { size: 'fill', grow: 1, wrap: true, phone: 'main' },
    cell: ({ row }) => (
      <Text variant="body-strong" as="span">
        {row.original.entry}
      </Text>
    ),
  }),
  col.display({ id: 'tier', header: 'Tier', meta: { size: 'xs', phone: 'hidden' }, cell: ({ row }) => <Text variant="body">{row.original.tier}</Text> }),
  col.display({ id: 'units', header: 'Units', meta: { size: 'md', align: 'end', phone: 'hidden' }, cell: ({ row }) => <Text variant="body">{row.original.units}</Text> }),
  col.display({
    id: 'amount',
    header: 'Amount',
    meta: { size: 'md', align: 'end', phone: 'amount' },
    cell: ({ row }) => (
      <Text variant="body-strong">
        <Conceal whole>{row.original.amount}</Conceal>
      </Text>
    ),
  }),
];

const RELATION_OPTIONS = [
  { value: 'SELF', label: 'Mine' },
  { value: 'CHILD', label: "My child's" },
];
const SECTOR_OPTIONS = (Object.keys(SECTOR_LABEL) as (keyof typeof SECTOR_LABEL)[]).map((value) => ({ value, label: SECTOR_LABEL[value] }));

/** One locked file: what to type, and Unlock. */
function LockedFile({ nps, f }: { nps: NpsImport; f: NpsImportFile }) {
  const busy = nps.busyId === f.id;
  return (
    <Card title={f.file.name} subtitle="Needs password">
      <div className="flex flex-col gap-space-8 p-space-16 desk:p-space-20">
        <TextField
          type="password"
          label={`Password for ${f.file.name}`}
          helper={`From the email the statement came with. ${PASSWORD_HINT}`}
          value={f.password}
          onChange={(e) => nps.setPassword(f.id, e.target.value)}
          disabled={busy}
          autoComplete="off"
        />
        <div>
          <Button variant="secondary" loading={busy} disabled={busy || !f.password} onClick={() => void nps.unlock(f.id)}>
            Unlock
          </Button>
        </div>
      </div>
    </Card>
  );
}

/** One read file: the lines of what importing does, the picks for a new account, and the first rows. */
function ReadFile({ nps, f }: { nps: NpsImport; f: NpsImportFile }) {
  const p = f.preview!;
  const rows = React.useMemo(() => firstRows(p), [p]);
  const views = React.useMemo(() => rows.shown.map(previewRow), [rows]);
  const picking = !p.account?.id;
  const proposal = p.account?.proposal;
  const incomplete = incompleteLine(p);
  const busy = nps.isCommitting;
  return (
    <div className="flex flex-col gap-space-8">
      <div className="flex flex-col">
        <Text variant="title" as="h3">
          {statementTitle(p)}
        </Text>
        <Text variant="caption" tone="ink-3" as="p" className="break-all">
          {f.file.name}
        </Text>
      </div>
      <Card>
        <div className="flex flex-col gap-space-8 desk:gap-space-12 p-space-16 desk:p-space-20">
          {alreadyImported(p) ? <Banner tone="info">Already imported</Banner> : null}
          {reviewLines(p).map((l) => (
            <ListRow key={l.label} title={l.label} trailing={<Text variant="body-strong" tone={l.tone} as="span">{l.value}</Text>} wrap />
          ))}
          {incomplete ? (
            <Text variant="label" tone="ink-3" as="p">
              {incomplete}
            </Text>
          ) : null}
          {picking ? (
            <>
              <Select
                label="Whose account"
                options={RELATION_OPTIONS}
                value={f.picks.relation ?? proposal?.relation ?? 'SELF'}
                onValueChange={(v) => nps.setPicks(f.id, { relation: (Array.isArray(v) ? v[0] : v) as 'SELF' | 'CHILD' })}
                disabled={busy}
              />
              {!proposal?.sector ? (
                <Select
                  label="Sector"
                  options={SECTOR_OPTIONS}
                  value={sectorOf(f) ?? ''}
                  onValueChange={(v) => nps.setPicks(f.id, { sector: (Array.isArray(v) ? v[0] : v) as keyof typeof SECTOR_LABEL })}
                  placeholder="Choose the sector"
                  disabled={busy}
                />
              ) : null}
              {needsPick(f) ? <Banner tone="warning">Choose the sector to create this account.</Banner> : null}
            </>
          ) : null}
        </div>
      </Card>
      {rows.total > 0 ? (
        <Card title={`New entries · first ${views.length} of ${rows.total}`}>
          <DataTable columns={columns} data={views} getRowId={(r) => r.id} phoneSub={(r) => <Text variant="caption" tone="ink-3" as="span">{`${r.date} · Tier ${r.tier}`}</Text>} stickyHeader={false} />
        </Card>
      ) : null}
    </div>
  );
}

/** Step 2 for the NPS statements: one block per file, locked ones with a password field. */
export function NpsReviewStep({ nps, mode, onModeChange }: { nps: NpsImport; mode: ImportMode; onModeChange: (mode: ImportMode) => void }) {
  const busy = nps.isCommitting || nps.isPreviewing;
  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-16">
      <Card title="What are you importing?">
        <div className="flex flex-col gap-space-8 desk:gap-space-12 p-space-16 desk:p-space-20">
          <TypeSelect mode={mode} onModeChange={onModeChange} disabled={busy} />
        </div>
      </Card>
      {nps.files.map((f) => {
        const state = fileState(f);
        if (state === 'password') return <LockedFile key={f.id} nps={nps} f={f} />;
        if (state === 'failed') {
          return (
            <Banner key={f.id} tone="danger">
              {`${f.file.name}: ${f.error}`}
            </Banner>
          );
        }
        return state === 'ready' ? <ReadFile key={f.id} nps={nps} f={f} /> : null;
      })}
    </div>
  );
}

/** Step 3 for the NPS statements: how many entries went in. */
export function NpsResultStep({ totals }: { totals: NpsImportTotals }) {
  return (
    <Card>
      <div className="flex flex-col items-center gap-space-4 p-space-20 text-center">
        <Text variant="title" as="h2">
          {resultTitle(totals)}
        </Text>
        <Text variant="body" tone="ink-3" as="p">
          {resultLine(totals)}
        </Text>
      </div>
    </Card>
  );
}

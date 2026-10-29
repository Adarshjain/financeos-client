'use client';

import React from 'react';

import {
  Button,
  Card,
  Checkbox,
  Dialog,
  ListRow,
  Select,
  showToast,
  Text,
  TextArea,
  TextField,
} from '@/components/ds';
import { AmountField, SettingsToggle } from '@/components/organisms';
import { amountExpressionProps } from '@/lib/amountExpression';
import { formatDate, formatMoney } from '@/lib/format';
import { ENTRY_TYPE_SHORT, toEntryType } from '@/lib/lendingEntry';
import { directionLabels, type ExportableEntry, type LendingExportToggles } from '@/lib/lendingExport';

import { type ExportLedgerState, useExportLedger } from '../useExportLedger';

const TOGGLE_LABELS: Record<keyof LendingExportToggles, string> = {
  includeNotes: 'Include notes',
  includeExpectedReturn: 'Include expected return dates',
  includeTotals: 'Include totals',
  includeRunningBalance: 'Running balance after each entry',
};

const notify = (message: string, tone: 'success' | 'danger') => showToast(message, { tone });

function EntryChecklist({ state }: { state: ExportLedgerState }) {
  const { entries, selectedIds, toggleEntry, selectAll, selectNone, selectSinceSettled, sinceSettledAvailable } = state;
  return (
    <div className="flex flex-col gap-space-8">
      <div className="flex flex-wrap items-center gap-x-space-12 gap-y-space-4">
        <Text variant="body-strong" as="span">
          Entries
        </Text>
        <Button variant="link" size="sm" onClick={selectAll}>
          All
        </Button>
        {sinceSettledAvailable ? (
          <Button variant="link" size="sm" onClick={selectSinceSettled}>
            Since last settled
          </Button>
        ) : null}
        <Button variant="link" size="sm" onClick={selectNone}>
          None
        </Button>
        <Text variant="caption" tone="ink-3" as="span" className="ml-auto" data-testid="export-selected-count">
          {`${selectedIds.size} selected`}
        </Text>
      </div>
      <Card>
        {entries.map((entry: ExportableEntry) => {
          const label = ENTRY_TYPE_SHORT[toEntryType(entry.direction, entry.kind)];
          const id = `export-entry-${entry.id}`;
          return (
            <ListRow
              key={entry.id}
              wrap
              leading={
                <Checkbox id={id} checked={selectedIds.has(entry.id)} onCheckedChange={() => toggleEntry(entry.id)} />
              }
              title={
                <label htmlFor={id} className="flex flex-wrap gap-x-space-12">
                  <Text variant="body" tone="ink-3" as="span">
                    {formatDate(entry.entryDate, 'list')}
                  </Text>
                  <Text variant="body" as="span">
                    {label}
                  </Text>
                </label>
              }
              subtitle={entry.notes || undefined}
              trailing={
                <Text variant="body-strong" as="span">
                  {formatMoney(entry.amount, { decimals: 'auto' })}
                </Text>
              }
            />
          );
        })}
      </Card>
    </div>
  );
}

function Options({ state }: { state: ExportLedgerState }) {
  const {
    myName,
    setMyName,
    theirName,
    setTheirName,
    cleanMyName,
    cleanTheirName,
    openingAmount,
    openingTheyOwe,
    openingIsDerived,
    openingIncluded,
    openingError,
    setOpeningAmount,
    clearOpening,
    resetOpening,
    toggles,
    setToggle,
  } = state;
  const labels = directionLabels(cleanMyName, cleanTheirName);
  const helper = !openingIncluded
    ? 'Not included — the text ends with the net of the listed entries.'
    : openingIsDerived
      ? 'Balance just before the first selected entry.'
      : 'Edited.';
  return (
    <>
      <div className="grid grid-cols-1 desk:grid-cols-2 gap-x-space-12 gap-y-space-8 desk:gap-y-space-12">
        <TextField label="Your name" value={myName} onValueChange={setMyName} placeholder="Blank reads as “I / me”" />
        <TextField
          label="Their name"
          value={theirName}
          onValueChange={setTheirName}
          placeholder="Blank reads as “you”"
        />
      </div>
      <div className="flex flex-col gap-space-4">
        <div className="flex flex-col desk:flex-row desk:items-end gap-space-8">
          <AmountField
            label="Opening balance"
            inputMode="decimal"
            value={openingAmount}
            {...amountExpressionProps(openingAmount, setOpeningAmount)}
            placeholder="Not included"
            error={openingError}
            className="desk:w-space-96"
          />
          <div className="flex items-center gap-space-8 desk:flex-1">
            <Select
              aria-label="Who owes"
              className="flex-1"
              disabled
              value={openingTheyOwe ? 'they' : 'me'}
              options={[
                { value: 'they', label: labels.theyOwe },
                { value: 'me', label: labels.iOwe },
              ]}
            />
            {openingIncluded ? (
              <Button variant="link" size="sm" onClick={clearOpening}>
                Clear
              </Button>
            ) : null}
          </div>
        </div>
        <Text variant="caption" tone="ink-3" as="p">
          {helper}
          {!openingIsDerived ? (
            <>
              {' '}
              <Button variant="link" size="sm" onClick={resetOpening}>
                Reset
              </Button>
            </>
          ) : null}
        </Text>
      </div>
      <div className="grid grid-cols-1 desk:grid-cols-2 desk:gap-x-space-24">
        {(Object.keys(TOGGLE_LABELS) as (keyof LendingExportToggles)[]).map((key) => (
          <SettingsToggle
            key={key}
            label={TOGGLE_LABELS[key]}
            checked={toggles[key]}
            onCheckedChange={(v) => setToggle(key, v)}
          />
        ))}
      </div>
    </>
  );
}

export interface ExportLedgerDialogProps {
  /** Every entry of the person, oldest first, with running balances. */
  entries: ExportableEntry[];
  theirName: string;
  /** The signed-in user's name; prefills "Your name" unless a saved value exists. */
  defaultMyName: string | null;
  onClose: () => void;
}

/**
 * Pick entries, name the parties, set an opening balance, and Share or Copy the resulting plain text. Mounted only
 * while open so every opening starts fresh. Where the browser cannot share, Copy takes Share's place.
 */
export function ExportLedgerDialog({ entries, theirName, defaultMyName, onClose }: ExportLedgerDialogProps) {
  const state = useExportLedger({ entries, theirName, defaultMyName, notify });
  const disabled = state.noneSelected || Boolean(state.openingError);
  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <Dialog.Content
        size="md"
        title="Export ledger"
        description="Pick the entries to include. The text below updates as you go."
        secondary={state.canShare ? { label: 'Copy', onSelect: state.copy, disabled } : undefined}
        primary={
          state.canShare
            ? { label: 'Share', onSelect: state.share, disabled }
            : { label: 'Copy', onSelect: state.copy, disabled }
        }
      >
        <Dialog.Body>
          <EntryChecklist state={state} />
          <Options state={state} />
          <TextArea
            label="Preview"
            readOnly
            minRows={8}
            maxRows={10}
            value={state.text}
            data-testid="ledger-export-preview"
          />
        </Dialog.Body>
      </Dialog.Content>
    </Dialog>
  );
}

'use client';

import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { directionLabels, type LendingExportToggles } from '@/lib/lendingExport';

import type { ExportLedgerState } from './useExportLedger';

const TOGGLE_LABELS: Record<keyof LendingExportToggles, string> = {
  includeNotes: 'Include notes',
  includeExpectedReturn: 'Include expected return dates',
  includeTotals: 'Include totals',
  includeRunningBalance: 'Running balance after each entry',
};

/** Names, opening balance and the content toggles. */
export function ExportLedgerOptions({ state }: { state: ExportLedgerState }) {
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
    setOpeningAmount,
    setOpeningTheyOwe,
    clearOpening,
    resetOpening,
    toggles,
    setToggle,
  } = state;

  const labels = directionLabels(cleanMyName, cleanTheirName);
  const openingIsZero = openingIncluded && Number(openingAmount) === 0;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div>
          <Label htmlFor="export-my-name">Your name</Label>
          <Input
            id="export-my-name"
            value={myName}
            onChange={(e) => setMyName(e.target.value)}
            placeholder="Blank reads as “I / me”"
            className="h-9 text-xs"
          />
        </div>
        <div>
          <Label htmlFor="export-their-name">Their name</Label>
          <Input
            id="export-their-name"
            value={theirName}
            onChange={(e) => setTheirName(e.target.value)}
            placeholder="Blank reads as “you”"
            className="h-9 text-xs"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="export-opening-amount">Opening balance</Label>
        <div className="flex flex-wrap items-center gap-1.5">
          <Input
            id="export-opening-amount"
            inputMode="decimal"
            value={openingAmount}
            onChange={(e) => setOpeningAmount(e.target.value)}
            placeholder="Not included"
            className="h-9 w-32 text-xs tabular-nums"
          />
          <Button
            size="pill"
            variant={openingTheyOwe ? 'filter-active' : 'filter'}
            disabled={!openingIncluded || openingIsZero}
            onClick={() => setOpeningTheyOwe(true)}
          >
            {labels.theyOwe}
          </Button>
          <Button
            size="pill"
            variant={!openingTheyOwe ? 'filter-active' : 'filter'}
            disabled={!openingIncluded || openingIsZero}
            onClick={() => setOpeningTheyOwe(false)}
          >
            {labels.iOwe}
          </Button>
          {openingIncluded && (
            <Button size="micro" variant="ghost" onClick={clearOpening}>
              Clear
            </Button>
          )}
        </div>
        <p className="text-2xs text-slate-500">
          {!openingIncluded ? (
            <>Not included — the text ends with the net of the listed entries. </>
          ) : openingIsDerived ? (
            <>Balance just before the first selected entry. </>
          ) : (
            <>Edited. </>
          )}
          {!openingIsDerived && (
            <Button size="micro" variant="link" onClick={resetOpening}>
              Reset
            </Button>
          )}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
        {(Object.keys(TOGGLE_LABELS) as (keyof LendingExportToggles)[]).map((key) => {
          const id = `export-toggle-${key}`;
          return (
            <div key={key} className="flex items-center gap-2">
              <Checkbox id={id} checked={toggles[key]} onCheckedChange={(v) => setToggle(key, v === true)} />
              <Label htmlFor={id} className="mb-0 cursor-pointer font-normal">
                {TOGGLE_LABELS[key]}
              </Label>
            </div>
          );
        })}
      </div>
    </div>
  );
}

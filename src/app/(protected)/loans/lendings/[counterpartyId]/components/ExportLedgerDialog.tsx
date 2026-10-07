'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import type { ExportableEntry } from '@/lib/lendingExport';

import { ExportEntryChecklist } from './ExportEntryChecklist';
import { ExportLedgerOptions } from './ExportLedgerOptions';
import { useExportLedger } from './useExportLedger';

interface ExportLedgerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Every loaded entry, ascending, with running balances. */
  entries: ExportableEntry[];
  theirName: string;
  defaultMyName: string | null;
  totalEntryCount: number;
}

/**
 * Pick entries, name the parties, set an opening balance, and Share or Copy the
 * resulting plain text. Mount only while open so every opening starts fresh.
 */
export function ExportLedgerDialog({
  open,
  onOpenChange,
  entries,
  theirName,
  defaultMyName,
  totalEntryCount,
}: ExportLedgerDialogProps) {
  const state = useExportLedger({ entries, theirName, defaultMyName });
  const disabled = state.noneSelected;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl w-[95vw]">
        <DialogHeader>
          <DialogTitle className="text-base font-bold">Export ledger</DialogTitle>
          <DialogDescription className="text-xs">
            Pick the entries to include. The text below updates as you go.
          </DialogDescription>
        </DialogHeader>
        <DialogBody className="space-y-5 text-xs">
          <ExportEntryChecklist state={state} totalEntryCount={totalEntryCount} />
          <ExportLedgerOptions state={state} />
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="mb-0">Preview</Label>
              {/* Share takes the footer's primary slot and Close the secondary one
                  (two actions max), so Copy sits by the preview on those devices. */}
              {state.canShare && (
                <Button size="micro" variant="outline" onClick={state.copy} disabled={disabled}>
                  Copy
                </Button>
              )}
            </div>
            <pre
              data-testid="ledger-export-preview"
              className="whitespace-pre-wrap break-words rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 p-3 text-xs leading-relaxed text-slate-800 dark:text-slate-200 select-text font-sans"
            >
              {state.text}
            </pre>
          </div>
        </DialogBody>
        <DialogFooter
          primaryAction={
            state.canShare
              ? { label: 'Share', onClick: state.share, disabled }
              : { label: 'Copy', onClick: state.copy, disabled }
          }
          secondaryAction={{ label: 'Close' }}
        />
      </DialogContent>
    </Dialog>
  );
}

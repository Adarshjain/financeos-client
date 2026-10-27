'use client';

import { AlertCircle, Loader2, Sparkles } from 'lucide-react';
import React from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

import { DividendSuggestionList } from './dividend-suggestions/DividendSuggestionList';
import { useDividendSuggestionsDialog } from './dividend-suggestions/useDividendSuggestionsDialog';

interface DividendSuggestionsDialogProps {
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function DividendSuggestionsDialog({
  trigger,
  onSuccess,
}: DividendSuggestionsDialogProps) {
  const {
    open,
    isScanning,
    isSubmitting,
    items,
    scannedSymbols,
    skippedSymbols,
    hasScanned,
    selectedCount,
    runScan,
    handleOpenChange,
    handleToggle,
    handleToggleAll,
    handleItemChange,
    handleSubmit,
  } = useDividendSuggestionsDialog({
    onSuccess,
  });

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            variant="outline"
            size="sm"
            className="border-emerald-300 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-950/60"
          >
            <Sparkles className="w-3.5 h-3.5" />
            Detect Dividends
          </Button>
        )}
      </DialogTrigger>

      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="text-base font-bold flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            Auto-Detect Dividends
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Scans Yahoo Finance for unrecorded dividend payouts on your stock
            and ETF holdings.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-3 min-h-[220px]">
          {isScanning ? (
            <div className="flex flex-col items-center justify-center py-12 space-y-3 text-center">
              <Loader2 className="w-8 h-8 animate-spin text-emerald-600 dark:text-emerald-400" />
              <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                Checking Yahoo for dividend events on your holdings...
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {hasScanned && (
                <p className="text-xs text-slate-500 px-1">
                  Checked {scannedSymbols}{' '}
                  {scannedSymbols === 1 ? 'symbol' : 'symbols'}
                  {skippedSymbols.length > 0 &&
                    `, skipped ${skippedSymbols.length}`}
                  .
                </p>
              )}

              {skippedSymbols.length > 0 && (
                <div className="flex items-center gap-2 p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-lg text-xs text-amber-800 dark:text-amber-300">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span>
                    Could not check Yahoo events for:{' '}
                    {skippedSymbols.join(', ')}
                  </span>
                </div>
              )}

              <DividendSuggestionList
                items={items}
                selectedCount={selectedCount}
                isScanning={isScanning}
                onRunScan={runScan}
                onToggle={handleToggle}
                onToggleAll={handleToggleAll}
                onItemChange={handleItemChange}
              />
            </div>
          )}
        </DialogBody>

        <DialogFooter
          primaryAction={{
            label: isSubmitting
              ? 'Recording...'
              : `Record ${selectedCount} Dividend${
                  selectedCount === 1 ? '' : 's'
                }`,
            onClick: handleSubmit,
            disabled: isSubmitting || selectedCount === 0,
          }}
          secondaryAction={{
            label: 'Cancel',
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

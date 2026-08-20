'use client';

import { AlertCircle, Check, Loader2, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { acceptDividendSuggestions, scanDividendSuggestions } from '@/actions/investments';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
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
import { Input } from '@/components/ui/input';
import { DividendSuggestion } from '@/lib/types';
import { cn, formatDate } from '@/lib/utils';

interface EditableSuggestionItem {
  suggestion: DividendSuggestion;
  selected: boolean;
  amount: string;
  payDate: string;
}

interface DividendSuggestionsDialogProps {
  trigger?: React.ReactNode;
  onSuccess?: () => void;
}

export function DividendSuggestionsDialog({ trigger, onSuccess }: DividendSuggestionsDialogProps) {
  const [open, setOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [items, setItems] = useState<EditableSuggestionItem[]>([]);
  const [scannedSymbols, setScannedSymbols] = useState(0);
  const [skippedSymbols, setSkippedSymbols] = useState<string[]>([]);
  const [hasScanned, setHasScanned] = useState(false);

  const handleOpenChange = async (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen && !hasScanned) {
      await runScan();
    }
  };

  const runScan = async () => {
    setIsScanning(true);
    try {
      const res = await scanDividendSuggestions();
      if (res.success) {
        setScannedSymbols(res.data.scannedSymbols);
        setSkippedSymbols(res.data.skippedSymbols || []);
        setItems(
          (res.data.suggestions || []).map((s) => ({
            suggestion: s,
            selected: true,
            amount: s.estimatedAmount,
            payDate: s.exDate,
          }))
        );
        setHasScanned(true);
      } else {
        toast.error(res.error.message);
      }
    } catch (err) {
      toast.error('Failed to scan dividends: ' + (err as Error).message);
    } finally {
      setIsScanning(false);
    }
  };

  const handleToggle = (index: number) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, selected: !item.selected } : item))
    );
  };

  const handleToggleAll = (checked: boolean) => {
    setItems((prev) => prev.map((item) => ({ ...item, selected: checked })));
  };

  const handleItemChange = (index: number, field: 'amount' | 'payDate', value: string) => {
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, [field]: value } : item))
    );
  };

  const handleSubmit = async () => {
    const selectedItems = items.filter((item) => item.selected);
    if (selectedItems.length === 0) {
      toast.error('Please select at least one dividend to record.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        items: selectedItems.map((item) => ({
          holdingId: item.suggestion.holdingId,
          exDate: item.suggestion.exDate,
          payDate: item.payDate,
          amount: Number(item.amount),
          perUnit: item.suggestion.perUnit ? Number(item.suggestion.perUnit) : undefined,
          notes: `Auto-detected dividend (${item.suggestion.qtyHeld} units @ ₹${item.suggestion.perUnit})`,
        })),
      };

      const res = await acceptDividendSuggestions(payload);
      if (res.success) {
        const createdCount = res.data.created.length;
        const skipped = res.data.skippedCount;
        toast.success(`Recorded ${createdCount} dividend(s)` + (skipped > 0 ? ` (${skipped} skipped as duplicate)` : ''));
        setOpen(false);
        onSuccess?.();
      } else {
        toast.error(res.error.message);
      }
    } catch (err) {
      toast.error('Failed to record dividends: ' + (err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedCount = items.filter((i) => i.selected).length;

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
            Scans Yahoo Finance for unrecorded dividend payouts on your stock and ETF holdings.
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
                <p className="text-[11px] text-slate-500 px-1">
                  Checked {scannedSymbols} {scannedSymbols === 1 ? 'symbol' : 'symbols'}
                  {skippedSymbols.length > 0 && `, skipped ${skippedSymbols.length}`}.
                </p>
              )}

              {skippedSymbols.length > 0 && (
                <div className="flex items-center gap-2 p-2.5 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-900/60 rounded-lg text-xs text-amber-800 dark:text-amber-300">
                  <AlertCircle className="w-4 h-4 shrink-0 text-amber-600 dark:text-amber-400" />
                  <span>Could not check Yahoo events for: {skippedSymbols.join(', ')}</span>
                </div>
              )}

              {items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 space-y-2 text-center">
                  <div className="w-10 h-10 rounded-full bg-emerald-50 dark:bg-emerald-950/60 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
                    <Check className="w-5 h-5" />
                  </div>
                  <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                    No unrecorded dividends found
                  </p>
                  <p className="text-[11px] text-slate-500 max-w-sm">
                    All recent stock dividend payouts for your active holdings appear to be recorded.
                  </p>
                  <Button
                    size="micro"
                    onClick={runScan}
                    disabled={isScanning}
                    className="text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                  >
                    Rescan
                  </Button>
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between px-1">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        id="select-all"
                        checked={selectedCount === items.length}
                        onCheckedChange={(checked) => handleToggleAll(!!checked)}
                      />
                      <label htmlFor="select-all" className="text-xs font-semibold text-slate-700 dark:text-slate-300 cursor-pointer">
                        Select All ({items.length} suggested)
                      </label>
                    </div>
                    <Button
                      size="micro"
                      onClick={runScan}
                      disabled={isScanning}
                      className="text-slate-500 hover:text-slate-900 dark:hover:text-slate-100"
                    >
                      Rescan
                    </Button>
                  </div>

                  <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/80">
                    {items.map((item, index) => {
                      const s = item.suggestion;
                      return (
                        <div
                          key={`${s.holdingId}-${s.exDate}`}
                          className={cn(
                            'p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs',
                            item.selected ? 'bg-white dark:bg-slate-900' : 'bg-slate-50/60 dark:bg-slate-950/40 opacity-75'
                          )}
                        >
                          <div className="flex items-start gap-2.5 min-w-0">
                            <Checkbox
                              checked={item.selected}
                              onCheckedChange={() => handleToggle(index)}
                              className="mt-0.5"
                            />
                            <div className="space-y-0.5 min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-slate-900 dark:text-slate-100">{s.symbol}</span>
                                <span className="text-[10px] text-slate-500 dark:text-slate-400 font-medium">{s.brokerName}</span>
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400 truncate">
                                {s.instrumentName}
                              </div>
                              <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-2 font-medium">
                                <span>Ex-Date: <strong className="text-slate-700 dark:text-slate-300">{formatDate(s.exDate)}</strong></span>
                                <span>•</span>
                                <span>Qty Held: <strong className="text-slate-700 dark:text-slate-300">{s.qtyHeld}</strong></span>
                                <span>•</span>
                                <span>₹{s.perUnit}/unit</span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                            <div className="space-y-1">
                              <label className="text-[10px] font-semibold text-slate-500 block">Pay Date</label>
                              <Input
                                type="date"
                                value={item.payDate}
                                onChange={(e) => handleItemChange(index, 'payDate', e.target.value)}
                                className="h-7 w-[125px] text-xs font-medium bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                              />
                            </div>

                            <div className="space-y-1">
                              <label className="text-[10px] font-semibold text-slate-500 block">Amount (INR)</label>
                              <Input
                                type="number"
                                step="0.01"
                                value={item.amount}
                                onChange={(e) => handleItemChange(index, 'amount', e.target.value)}
                                className="h-7 w-[105px] text-xs font-bold text-right text-emerald-600 dark:text-emerald-400 bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800"
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </>
              )}
            </div>
          )}
        </DialogBody>

        <DialogFooter
          primaryAction={{
            label: isSubmitting ? 'Recording...' : `Record ${selectedCount} Dividend${selectedCount === 1 ? '' : 's'}`,
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

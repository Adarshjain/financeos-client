'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import {
  acceptDividendSuggestions,
  scanDividendSuggestions,
} from '@/actions/investments';

import { EditableSuggestionItem } from './DividendSuggestionList';

interface UseDividendSuggestionsDialogProps {
  onSuccess?: () => void;
}

export function useDividendSuggestionsDialog({
  onSuccess,
}: UseDividendSuggestionsDialogProps) {
  const [open, setOpen] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [items, setItems] = useState<EditableSuggestionItem[]>([]);
  const [scannedSymbols, setScannedSymbols] = useState(0);
  const [skippedSymbols, setSkippedSymbols] = useState<string[]>([]);
  const [hasScanned, setHasScanned] = useState(false);

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

  const handleOpenChange = async (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen && !hasScanned) {
      await runScan();
    }
  };

  const handleToggle = (index: number) => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, selected: !item.selected } : item
      )
    );
  };

  const handleToggleAll = (checked: boolean) => {
    setItems((prev) =>
      prev.map((item) => ({ ...item, selected: checked }))
    );
  };

  const handleItemChange = (
    index: number,
    field: 'amount' | 'payDate',
    value: string
  ) => {
    setItems((prev) =>
      prev.map((item, i) =>
        i === index ? { ...item, [field]: value } : item
      )
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
          perUnit: item.suggestion.perUnit
            ? Number(item.suggestion.perUnit)
            : undefined,
          notes: `Auto-detected dividend (${item.suggestion.qtyHeld} units @ ₹${item.suggestion.perUnit})`,
        })),
      };

      const res = await acceptDividendSuggestions(payload);
      if (res.success) {
        const createdCount = res.data.created.length;
        const skipped = res.data.skippedCount;
        toast.success(
          `Recorded ${createdCount} dividend(s)` +
            (skipped > 0 ? ` (${skipped} skipped as duplicate)` : '')
        );
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

  return {
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
  };
}

'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';

import { api, ApiError } from '@/lib/api/client';
import type { Schemas } from '@/lib/api/types';
import { keys } from '@/lib/query/keys';
import type {
  AcceptSuggestionsRequest,
  AcceptSuggestionsResponse,
  DividendSuggestionsResponse,
} from '@/lib/types';

import { EditableSuggestionItem } from './DividendSuggestionList';

interface UseDividendSuggestionsDialogProps {
  onSuccess?: () => void;
}

export function useDividendSuggestionsDialog({
  onSuccess,
}: UseDividendSuggestionsDialogProps) {
  const [open, setOpen] = useState(false);
  const qc = useQueryClient();
  const scanMutation = useMutation({
    mutationFn: () =>
      api
        .GET('/api/v1/investments/dividends/suggestions', {
          params: { query: {} },
        })
        .then((r) => r.data! as DividendSuggestionsResponse),
  });
  const acceptMutation = useMutation({
    mutationFn: (body: AcceptSuggestionsRequest) =>
      api
        .POST('/api/v1/investments/dividends/suggestions/accept', {
          // The generated schema marks every `Item` field (incl. notes/perUnit) as
          // required, though both are genuinely optional in practice — this form
          // always supplies notes, and perUnit is only sometimes known. See "Spec
          // follow-ups" in the migration report.
          body: body as Schemas['AcceptSuggestionsRequest'],
        })
        .then((r) => r.data! as AcceptSuggestionsResponse),
    onSuccess: () => qc.invalidateQueries({ queryKey: keys.investments.all }),
  });
  const isScanning = scanMutation.isPending;
  const isSubmitting = acceptMutation.isPending;

  const [items, setItems] = useState<EditableSuggestionItem[]>([]);
  const [scannedSymbols, setScannedSymbols] = useState(0);
  const [skippedSymbols, setSkippedSymbols] = useState<string[]>([]);
  const [hasScanned, setHasScanned] = useState(false);

  const runScan = async () => {
    try {
      const data = await scanMutation.mutateAsync();
      setScannedSymbols(data.scannedSymbols);
      setSkippedSymbols(data.skippedSymbols || []);
      setItems(
        (data.suggestions || []).map((s) => ({
          suggestion: s,
          selected: true,
          amount: s.estimatedAmount,
          payDate: s.exDate,
        }))
      );
      setHasScanned(true);
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.response.message
          : 'Failed to scan dividends'
      );
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
    setItems((prev) => prev.map((item) => ({ ...item, selected: checked })));
  };

  const handleItemChange = (
    index: number,
    field: 'amount' | 'payDate',
    value: string
  ) => {
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

    try {
      const payload: AcceptSuggestionsRequest = {
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

      const data = await acceptMutation.mutateAsync(payload);
      const createdCount = data.created.length;
      const skipped = data.skippedCount;
      toast.success(
        `Recorded ${createdCount} dividend(s)` +
          (skipped > 0 ? ` (${skipped} skipped as duplicate)` : '')
      );
      setOpen(false);
      onSuccess?.();
    } catch (err) {
      toast.error(
        err instanceof ApiError
          ? err.response.message
          : 'Failed to record dividends'
      );
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

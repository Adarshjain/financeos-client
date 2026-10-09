'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useState } from 'react';
import { toast } from 'sonner';

import { api } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';
import { toastError } from '@/lib/toastError';

/**
 * Unverified rules picked for bulk approve. The selection survives paging; the
 * caller clears it when the tab, filters or search change the result set.
 */
export function useRuleSelection() {
  const queryClient = useQueryClient();
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const bulkVerifyMutation = useMutation({
    mutationFn: (ruleIds: string[]) =>
      api.POST('/api/v1/rules/verify', { body: { ruleIds } }).then((r) => r.data!),
    onSuccess: ({ verifiedCount }) => {
      toast.success(
        `${verifiedCount} rule${verifiedCount === 1 ? '' : 's'} verified — matching transactions cleared from review`
      );
      setSelectedIds([]);
      queryClient.invalidateQueries({ queryKey: keys.rules.all });
    },
    onError: (error) => toastError(error, 'Failed to verify rules.'),
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((selectedId) => selectedId !== id) : [...prev, id]
    );
  };

  const selectPage = (checked: boolean | 'indeterminate', pageIds: string[]) => {
    setSelectedIds((prev) =>
      checked === true
        ? Array.from(new Set([...prev, ...pageIds]))
        : prev.filter((id) => !pageIds.includes(id))
    );
  };

  // A deleted or individually verified rule must leave the selection: the bulk
  // endpoint is all-or-nothing, so a deleted id would fail the whole batch.
  const deselect = (id: string) => {
    setSelectedIds((prev) => prev.filter((selectedId) => selectedId !== id));
  };

  const bulkVerify = () => {
    if (selectedIds.length === 0) return;
    bulkVerifyMutation.mutate(selectedIds);
  };

  return {
    selectedIds,
    setSelectedIds,
    toggleSelect,
    selectPage,
    deselect,
    bulkVerify,
    isBulkVerifying: bulkVerifyMutation.isPending,
  };
}

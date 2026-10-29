'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { createLlmKey, deleteLlmKey, testLlmKey, updateLlmKeyPosition } from '@/features/settings/ai/llmActions';
import { unwrapAction } from '@/lib/actionResult';
import type { CreateLlmKeyRequest, LlmKeyDto } from '@/lib/api/types';
import { keys } from '@/lib/query/keys';

/**
 * Adding or removing a key changes downstream state too — a routing option
 * only becomes `available` once a key exists for its provider, and health
 * entries come and go with keys — so both invalidate the whole `settings`
 * family (mirrors the old `refreshAllData()` refetch-everything behaviour).
 */
export function useLlmKeyMutations() {
  const qc = useQueryClient();
  const invalidateAll = () => {
    return qc.invalidateQueries({ queryKey: keys.settings.all });
  };

  const createMutation = useMutation({
    mutationFn: (body: CreateLlmKeyRequest) => unwrapAction(createLlmKey(body)),
    onSuccess: invalidateAll,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => unwrapAction(deleteLlmKey(id)),
    onSuccess: invalidateAll,
  });

  // The endpoint returns the reordered list for the key's provider — write it
  // straight into the cache instead of a full refetch.
  const updatePositionMutation = useMutation({
    mutationFn: ({ id, position }: { id: string; position: number }) => unwrapAction(updateLlmKeyPosition(id, position)),
    onSuccess: (updatedProviderKeys) => {
      qc.setQueryData(keys.settings.llmKeys(), (current: LlmKeyDto[] | undefined) => {
        if (!current) return updatedProviderKeys;
        const updatedIds = new Set(updatedProviderKeys.map((k) => k.id));
        return [...current.filter((k) => !updatedIds.has(k.id)), ...updatedProviderKeys];
      });
    },
  });

  const testMutation = useMutation({
    mutationFn: ({ id, model }: { id: string; model?: string }) => unwrapAction(testLlmKey(id, model)),
  });

  return { createMutation, deleteMutation, updatePositionMutation, testMutation };
}

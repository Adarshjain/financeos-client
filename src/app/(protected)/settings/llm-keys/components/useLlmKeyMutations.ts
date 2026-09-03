'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';

import { api } from '@/lib/api/client';
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
  const invalidateAll = () => qc.invalidateQueries({ queryKey: keys.settings.all });

  const createMutation = useMutation({
    mutationFn: (body: CreateLlmKeyRequest) => api.POST('/api/v1/llm-keys', { body }).then((r) => r.data!),
    onSuccess: invalidateAll,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => api.DELETE('/api/v1/llm-keys/{id}', { params: { path: { id } } }),
    onSuccess: invalidateAll,
  });

  // The endpoint returns the reordered list for the key's provider — write it
  // straight into the cache instead of a full refetch.
  const updatePositionMutation = useMutation({
    mutationFn: ({ id, position }: { id: string; position: number }) =>
      api
        .PATCH('/api/v1/llm-keys/{id}/position', { params: { path: { id } }, body: { position } })
        .then((r) => r.data!),
    onSuccess: (updatedProviderKeys) => {
      qc.setQueryData(keys.settings.llmKeys(), (current: LlmKeyDto[] | undefined) => {
        if (!current) return updatedProviderKeys;
        const updatedIds = new Set(updatedProviderKeys.map((k) => k.id));
        return [...current.filter((k) => !updatedIds.has(k.id)), ...updatedProviderKeys];
      });
    },
  });

  const testMutation = useMutation({
    mutationFn: ({ id, model }: { id: string; model?: string }) =>
      api.POST('/api/v1/llm-keys/{id}/test', { params: { path: { id } }, body: { model } }).then((r) => r.data!),
  });

  return { createMutation, deleteMutation, updatePositionMutation, testMutation };
}

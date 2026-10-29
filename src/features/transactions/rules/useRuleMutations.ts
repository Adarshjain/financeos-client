'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import { showToast } from '@/components/ds';
import { api, ApiError } from '@/lib/api/client';
import { getErrorMessage } from '@/lib/api/errorMessage';
import type { Schemas } from '@/lib/api/types';
import { keys } from '@/lib/query/keys';
import type { CategoryRule } from '@/lib/rules.types';

const isConflict = (error: unknown) =>
  error instanceof ApiError &&
  (error.response.code === 'CONFLICT' ||
    (error.response.message || '').toLowerCase().includes('already exists') ||
    (error.response.message || '').toLowerCase().includes('duplicate'));

/** Most rows the server takes in one unverify call. */
const RESTORE_CHUNK = 5000;

/** Add, edit, delete and approve rules. The list is server-rendered, so each success refreshes the page. */
export function useRuleMutations(handlers: { onSaved?: () => void; onDeleted?: (id: string) => void; onVerified?: (ids: string[]) => void } = {}) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const done = () => {
    void queryClient.invalidateQueries({ queryKey: keys.rules.all });
    router.refresh();
  };
  const failed = (fallback: string) => (e: unknown) => showToast(getErrorMessage(e, fallback), { tone: 'danger' });

  const create = useMutation({
    mutationFn: (body: Schemas['CreateRuleRequest']) => api.POST('/api/v1/rules', { body }).then((r) => r.data),
    onSuccess: () => {
      showToast('Rule created');
      handlers.onSaved?.();
      done();
    },
    onError: (e) =>
      showToast(isConflict(e) ? 'A rule for this pattern already exists.' : getErrorMessage(e, "Couldn't create the rule. Try again."), {
        tone: 'danger',
      }),
  });

  const update = useMutation({
    mutationFn: ({ id, body }: { id: string; body: Schemas['UpdateRuleRequest'] }) =>
      api.PUT('/api/v1/rules/{id}', { params: { path: { id } }, body }).then((r) => r.data),
    onSuccess: () => {
      showToast('Rule updated');
      handlers.onSaved?.();
      done();
    },
    onError: failed("Couldn't update the rule. Try again."),
  });

  const remove = useMutation({
    mutationFn: (rule: CategoryRule) => api.DELETE('/api/v1/rules/{id}', { params: { path: { id: rule.id } } }),
    onSuccess: (_data, rule) => {
      showToast('Rule deleted');
      handlers.onDeleted?.(rule.id);
      done();
    },
    onError: failed("Couldn't delete the rule. Try again."),
  });

  // Undo of an approve: sends back what the approve returned, so the server restores every row it cleared
  // exactly (rows edited since are left alone). Rows go in chunks of the server's limit, one rule at a time;
  // repeating the unverify for later chunks is harmless. Resolves with how many rules could not be undone.
  const unverifyMany = useMutation({
    mutationFn: async (undo: { id: string; restore: Schemas['ClearedTransaction'][] }[]) => {
      const results = await Promise.allSettled(
        undo.map(async ({ id, restore }) => {
          for (let from = 0; from === 0 || from < restore.length; from += RESTORE_CHUNK) {
            const { data, error } = await api.POST('/api/v1/rules/{id}/unverify', {
              params: { path: { id } },
              body: { transactionIds: [], restore: restore.slice(from, from + RESTORE_CHUNK) },
            });
            if (error || !data) throw error ?? new Error("Couldn't undo");
          }
        }),
      );
      return { failed: results.filter((r) => r.status === 'rejected').length, total: undo.length };
    },
    onSuccess: ({ failed, total }) => {
      if (failed === 0) return;
      showToast(
        failed === total ? "Couldn't undo the approval. Try again." : `Couldn't undo ${failed} of ${total} rules. Try again.`,
        { tone: 'danger' },
      );
    },
    onError: failed("Couldn't undo the approval. Try again."),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: keys.transactions.all });
      void queryClient.invalidateQueries({ queryKey: keys.transactions.needsReviewCount() });
      done();
    },
  });

  const verify = useMutation({
    mutationFn: (rule: CategoryRule) => api.POST('/api/v1/rules/{id}/verify', { params: { path: { id: rule.id } } }).then((r) => r.data),
    onSuccess: (data, rule) => {
      showToast('Rule verified. Matching transactions are cleared from review.', {
        action: { label: 'Undo', onSelect: () => unverifyMany.mutate([{ id: rule.id, restore: data?.clearedTransactions ?? [] }]) },
      });
      handlers.onVerified?.([rule.id]);
      done();
    },
    onError: failed("Couldn't verify the rule. Try again."),
  });

  const verifyMany = useMutation({
    mutationFn: (ruleIds: string[]) => api.POST('/api/v1/rules/verify', { body: { ruleIds } }).then((r) => r.data!),
    onSuccess: ({ verifiedCount, verifiedRules }, ruleIds) => {
      // Only rules that were unverified have an entry; the rest were already verified and stay so.
      const undo = (verifiedRules ?? []).map((v) => ({ id: v.ruleId, restore: v.clearedTransactions }));
      showToast(
        `${verifiedCount} ${verifiedCount === 1 ? 'rule' : 'rules'} verified. Matching transactions are cleared from review.`,
        { action: { label: 'Undo', onSelect: () => unverifyMany.mutate(undo) } },
      );
      handlers.onVerified?.(ruleIds);
      done();
    },
    onError: failed("Couldn't verify the rules. Try again."),
  });

  return { create, update, remove, verify, verifyMany };
}

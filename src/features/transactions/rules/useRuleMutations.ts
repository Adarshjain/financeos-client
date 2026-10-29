'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import { showToast } from '@/components/ds';
import { ActionError, unwrapAction } from '@/lib/actionResult';
import { getErrorMessage } from '@/lib/api/errorMessage';
import type { Schemas } from '@/lib/api/types';
import { keys } from '@/lib/query/keys';
import type { CategoryRule } from '@/lib/rules.types';

import { createRule, deleteRule, unverifyRule, updateRule, verifyRule, verifyRules } from './ruleActions';

// A second rule for the same pattern and match type trips the database's unique constraint, which the server answers
// with code CONFLICT (GlobalExceptionHandler, DataIntegrityViolation); its message is generic, so only the code is read.
const isConflict = (error: unknown) => error instanceof ActionError && error.response.code === 'CONFLICT';

/** Rows sent per unverify call: under the server's own limit (5000), and small enough for a server action's 1 MB body. */
const RESTORE_CHUNK = 2000;

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
    mutationFn: (body: Schemas['CreateRuleRequest']) => unwrapAction(createRule(body)),
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
      unwrapAction(updateRule(id, body)),
    onSuccess: () => {
      showToast('Rule updated');
      handlers.onSaved?.();
      done();
    },
    onError: failed("Couldn't update the rule. Try again."),
  });

  const remove = useMutation({
    mutationFn: (rule: CategoryRule) => unwrapAction(deleteRule(rule.id)),
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
            await unwrapAction(unverifyRule(id, restore.slice(from, from + RESTORE_CHUNK)));
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
    mutationFn: (rule: CategoryRule) => unwrapAction(verifyRule(rule.id)),
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
    mutationFn: (ruleIds: string[]) => unwrapAction(verifyRules(ruleIds)),
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

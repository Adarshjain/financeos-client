'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import { showToast } from '@/components/ds';
import { undoApproveTransactions } from '@/features/transactions/transactionActions';
import { unwrapAction } from '@/lib/actionResult';
import { getErrorMessage } from '@/lib/api/errorMessage';
import type { components } from '@/lib/api/schema';
import { keys } from '@/lib/query/keys';

export type ClearedTransaction = components['schemas']['ClearedTransaction'];
export type VerifiedRule = components['schemas']['VerifiedRuleChange'];

/**
 * The Undo behind every "Approved" Toast: sends back what the approve cleared (rows and the rules it verified)
 * in one all-or-nothing request, then refreshes rules, lists, the Needs review count and the page. Rows edited
 * since are skipped by the server.
 */
export function useUndoApprove() {
  const qc = useQueryClient();
  const router = useRouter();

  const mutation = useMutation({
    mutationFn: ({ approved, verifiedRules }: { approved: ClearedTransaction[]; verifiedRules: VerifiedRule[] }) =>
      unwrapAction(
        undoApproveTransactions({
          approved,
          rules: verifiedRules.map((r) => ({ ruleId: r.ruleId, restore: r.clearedTransactions })),
        }),
      ),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: keys.rules.all });
      qc.invalidateQueries({ queryKey: keys.transactions.all });
      qc.invalidateQueries({ queryKey: keys.transactions.needsReviewCount() });
      router.refresh();
    },
    onError: (e) => showToast(getErrorMessage(e, "Couldn't undo. Try again."), { tone: 'danger' }),
  });

  return (approved: ClearedTransaction[], verifiedRules: VerifiedRule[]) => mutation.mutate({ approved, verifiedRules });
}

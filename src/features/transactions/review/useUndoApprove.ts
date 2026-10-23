'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import { showToast } from '@/components/ds';
import { api } from '@/lib/api/client';
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

  return async (approved: ClearedTransaction[], verifiedRules: VerifiedRule[]) => {
    try {
      const { data, error } = await api.POST('/api/v1/transactions/undo-approve', {
        body: {
          approved,
          rules: verifiedRules.map((r) => ({ ruleId: r.ruleId, restore: r.clearedTransactions })),
        },
      });
      if (error || !data) throw error ?? new Error('Could not undo');
      qc.invalidateQueries({ queryKey: keys.rules.all });
      qc.invalidateQueries({ queryKey: keys.transactions.all });
      qc.invalidateQueries({ queryKey: keys.transactions.needsReviewCount() });
      router.refresh();
    } catch (e) {
      showToast(getErrorMessage(e, 'Could not undo'), { tone: 'danger' });
    }
  };
}

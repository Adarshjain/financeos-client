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

  const verify = useMutation({
    mutationFn: (rule: CategoryRule) => api.POST('/api/v1/rules/{id}/verify', { params: { path: { id: rule.id } } }).then((r) => r.data),
    onSuccess: (_data, rule) => {
      showToast('Rule verified. Matching transactions are cleared from review.');
      handlers.onVerified?.([rule.id]);
      done();
    },
    onError: failed("Couldn't verify the rule. Try again."),
  });

  const verifyMany = useMutation({
    mutationFn: (ruleIds: string[]) => api.POST('/api/v1/rules/verify', { body: { ruleIds } }).then((r) => r.data!),
    onSuccess: ({ verifiedCount }, ruleIds) => {
      showToast(
        `${verifiedCount} ${verifiedCount === 1 ? 'rule' : 'rules'} verified. Matching transactions are cleared from review.`,
      );
      handlers.onVerified?.(ruleIds);
      done();
    },
    onError: failed("Couldn't verify the rules. Try again."),
  });

  return { create, update, remove, verify, verifyMany };
}

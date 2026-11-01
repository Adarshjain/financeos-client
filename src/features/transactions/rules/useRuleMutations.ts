'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import { showToast } from '@/components/ds/Toast/Toast';
import { ActionError, unwrapAction } from '@/lib/actionResult';
import { getErrorMessage } from '@/lib/api/errorMessage';
import type { Schemas } from '@/lib/api/types';
import { keys } from '@/lib/query/keys';
import type { CategoryRule } from '@/lib/rules.types';

import { createRule, deleteRule, updateRule } from './ruleActions';

// A second rule for the same pattern and match type trips the database's unique constraint, which the server answers
// with code CONFLICT (GlobalExceptionHandler, DataIntegrityViolation); its message is generic, so only the code is read.
const isConflict = (error: unknown) => error instanceof ActionError && error.response.code === 'CONFLICT';

/** Add, edit and delete rules. The list is server-rendered, so each success refreshes the page. */
export function useRuleMutations(handlers: { onSaved?: () => void; onDeleted?: (id: string) => void } = {}) {
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

  return { create, update, remove };
}

'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';

import { showToast } from '@/components/ds/Toast/Toast';
import { emitJobStarted } from '@/features/jobs/jobsBus';
import { ActionError, unwrapAction } from '@/lib/actionResult';
import { getErrorMessage } from '@/lib/api/errorMessage';
import type { Schemas } from '@/lib/api/types';
import { keys } from '@/lib/query/keys';
import type { CategoryRule } from '@/lib/rules.types';

import { applyRule, createRule, deleteRule, updateRule } from './ruleActions';

// A second rule for the same pattern and match type trips the database's unique constraint, which the server answers
// with code CONFLICT (GlobalExceptionHandler, DataIntegrityViolation); its message is generic, so only the code is read.
const isConflict = (error: unknown) => error instanceof ActionError && error.response.code === 'CONFLICT';

/** Add, edit and delete rules. The list is server-rendered, so each success refreshes the page. */
export function useRuleMutations(handlers: { onSaved?: (rule: CategoryRule) => void; onDeleted?: (id: string) => void } = {}) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const done = () => {
    void queryClient.invalidateQueries({ queryKey: keys.rules.all });
    router.refresh();
  };
  const failed = (fallback: string) => (e: unknown) => showToast(getErrorMessage(e, fallback), { tone: 'danger' });

  const create = useMutation({
    mutationFn: (body: Schemas['CreateRuleRequest']) => unwrapAction(createRule(body)),
    onSuccess: (rule) => {
      showToast('Rule created');
      handlers.onSaved?.(rule as CategoryRule);
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
    onSuccess: (rule) => {
      showToast('Rule updated');
      handlers.onSaved?.(rule as CategoryRule);
      done();
    },
    onError: (e) =>
      showToast(isConflict(e) ? 'A rule for this pattern already exists.' : getErrorMessage(e, "Couldn't update the rule. Try again."), {
        tone: 'danger',
      }),
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

  /** "Also update past matches": starts the job that gives every match of the rule its category. */
  const applyToPast = useMutation({
    mutationFn: (id: string) => unwrapAction(applyRule(id, { all: true })),
    onSuccess: (data) => {
      if (data?.jobId) emitJobStarted(data.jobId);
      showToast('Updating past matches');
    },
    onError: failed("Couldn't update the past matches. Try again."),
  });

  return { create, update, remove, applyToPast };
}

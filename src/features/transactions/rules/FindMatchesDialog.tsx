'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import React from 'react';

import { Checkbox, Dialog, EmptyState, ListRow, Pager, showToast, Skeleton, Text } from '@/components/ds';
import { ErrorState } from '@/components/organisms';
import { emitJobStarted } from '@/features/jobs/jobsBus';
import { useJobStatusPolling } from '@/features/jobs/useJobStatusPolling';
import { activityUrl } from '@/features/settings/activity/activityModel';
import { unwrapAction } from '@/lib/actionResult';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { formatCount } from '@/lib/format';
import { keys } from '@/lib/query/keys';
import type { ApplyRuleResult, CategoryRule } from '@/lib/rules.types';

import { MatchRow } from './MatchRow';
import { applyRule } from './ruleActions';
import { RULE_JOB_TYPE, ruleMatchSentence } from './rulesModel';
import { useRuleMatches } from './useRuleMatches';

export const MATCHES_PAGE_SIZE = 20;

export interface FindMatchesDialogProps {
  rule: CategoryRule;
  onClose: () => void;
}

/**
 * Runs the rule's pattern over the transactions and lists what it matches (manually reviewed ones left out), nothing ticked.
 * Apply gives the ticked ones the rule's categories and links them to the rule. "Select all N" takes every match, on every page.
 */
export function FindMatchesDialog({ rule, onClose }: FindMatchesDialogProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { page, setPage, matches, loading, failed, refetch } = useRuleMatches({
    merchantKey: rule.merchantKey,
    matchType: rule.matchType,
    size: MATCHES_PAGE_SIZE,
  });
  const [picked, setPicked] = React.useState<string[]>([]);
  const [all, setAll] = React.useState(false);
  const [jobId, setJobId] = React.useState<string | null>(null);

  const applyMutation = useMutation({
    mutationFn: (body: { all: true } | { transactionIds: string[] }) => unwrapAction(applyRule(rule.id, body)),
    onSuccess: (data) => {
      if (data?.jobId) {
        setJobId(data.jobId);
        emitJobStarted(data.jobId);
      }
    },
    onError: (e) => showToast(getErrorMessage(e, "Couldn't apply the rule. Try again."), { tone: 'danger' }),
  });

  const rows = matches?.content ?? [];
  const total = matches?.totalElements ?? 0;
  const count = all ? total : picked.length;
  const applying = applyMutation.isPending || jobId !== null;

  useJobStatusPolling<ApplyRuleResult>(jobId, (job) => {
    setJobId(null);
    if (job.status === 'SUCCEEDED' && job.result) {
      const n = job.result.appliedCount;
      showToast(`Rule applied to ${formatCount(n, ['transaction', 'transactions'])}`, {
        action: {
          label: 'View',
          href: activityUrl({ statusFilter: '', typeFilter: RULE_JOB_TYPE, size: 25 }, { job: job.id }),
        },
      });
      void queryClient.invalidateQueries({ queryKey: keys.rules.all });
      void queryClient.invalidateQueries({ queryKey: keys.transactions.all });
      router.refresh();
      onClose();
    } else if (job.status === 'FAILED') {
      showToast(job.errorMessage || "Couldn't apply the rule. Try again.", { tone: 'danger' });
    } else if (job.status === 'CANCELLED') {
      showToast('Rule apply cancelled');
    }
  });

  const toggle = (id: string, on: boolean) => {
    if (all) {
      // One row off "all" leaves this page's rows, less that one: the server takes ids or everything, never everything but some.
      setAll(false);
      setPicked(rows.map((r) => r.id).filter((x) => x !== id));
      return;
    }
    setPicked((prev) => (on ? [...new Set([...prev, id])] : prev.filter((x) => x !== id)));
  };

  const apply = () => {
    if (count === 0) return;
    applyMutation.mutate(all ? { all: true } : { transactionIds: picked });
  };

  return (
    <Dialog open onOpenChange={(open) => (open || applying ? undefined : onClose())}>
      <Dialog.Content
        size="lg"
        title={`Matching transactions · ${rule.displayName || rule.merchantKey}`}
        description={`${ruleMatchSentence(rule)} · manually reviewed transactions are left out.`}
        secondary={{ label: 'Cancel', onSelect: onClose, disabled: applying }}
        primary={{
          label: count > 0 ? `Apply rule (${count})` : 'Apply rule',
          onSelect: apply,
          loading: applying,
          disabled: count === 0 || applying,
        }}
      >
        <Dialog.Body className="flex flex-col gap-space-8 desk:gap-space-8">
          {failed ? (
            <ErrorState
              title="Couldn't load matches"
              description="The matches didn't load."
              action={{ label: 'Retry', onSelect: refetch }}
            />
          ) : loading ? (
            <Skeleton height={48} />
          ) : total === 0 ? (
            <EmptyState compact title="No transactions match this rule" />
          ) : (
            <>
              <ListRow
                borderTop={false}
                role="checkbox"
                aria-checked={all}
                onClick={() => {
                  setAll(!all);
                  setPicked([]);
                }}
                leading={<Checkbox checked={all} tabIndex={-1} aria-hidden="true" />}
                title={`Select all ${formatCount(total, ['match', 'matches'])}`}
              />
              <div>
                {rows.map((txn) => (
                  <MatchRow
                    key={txn.id}
                    txn={txn}
                    ruleId={rule.id}
                    checked={all || picked.includes(txn.id)}
                    onCheckedChange={(on) => toggle(txn.id, on)}
                  />
                ))}
              </div>
              {matches && matches.totalPages > 1 ? (
                <Pager
                  variant="compact"
                  page={page}
                  size={MATCHES_PAGE_SIZE}
                  totalElements={total}
                  totalPages={matches.totalPages}
                  unit="matches"
                  onPageChange={setPage}
                />
              ) : null}
              <Text variant="caption" tone="ink-3" as="p">
                Applying sets the rule&apos;s categories on the ticked transactions and links them to this rule.
              </Text>
            </>
          )}
        </Dialog.Body>
      </Dialog.Content>
    </Dialog>
  );
}

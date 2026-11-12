'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import React from 'react';

import { showToast } from '@/components/ds/Toast/Toast';
import { ClosePrompt } from '@/features/shell/ClosePrompt';
import { unwrapAction } from '@/lib/actionResult';
import { getErrorMessage } from '@/lib/api/errorMessage';
import type { LoanCloseEvidence } from '@/lib/api/types';
import { keys } from '@/lib/query/keys';
import { useAppRouter } from '@/lib/useAppRouter';

import { closeEvidenceLines } from './closeEvidenceModel';
import { useLoanDetailMutations } from './detail/useLoanDetailMutations';
import { dismissLoanClosedPrompt, loadLoanCloseEvidence } from './loanActions';

/** "Is this loan closed?" with Yes, closed (the loan's own Close) and Not yet (asks no more). Refreshes after. */
export function LoanClosedPrompt({
  loanId,
  evidence,
  className,
}: {
  loanId: string;
  /** The facts behind the question; leave undefined to load them (the Upcoming rows), null when there are none. */
  evidence?: LoanCloseEvidence | null;
  className?: string;
}) {
  const { data: loaded } = useQuery({
    queryKey: [...keys.obligations.all, 'loanCloseEvidence', loanId],
    queryFn: () => unwrapAction(loadLoanCloseEvidence(loanId)),
    enabled: evidence === undefined,
  });
  const router = useAppRouter();
  const qc = useQueryClient();
  const { closeLoan } = useLoanDetailMutations(loanId);
  const [saving, setSaving] = React.useState(false);
  // The prompt stays busy until the refreshed page shows.
  const [refreshing, startRefresh] = React.useTransition();
  const busy = saving || refreshing;

  const done = () => {
    void qc.invalidateQueries({ queryKey: keys.obligations.all });
    startRefresh(() => router.refresh());
  };
  const yes = async () => {
    if (busy) return;
    setSaving(true);
    try {
      await closeLoan();
      done();
    } finally {
      setSaving(false);
    }
  };
  const notYet = async () => {
    if (busy) return;
    setSaving(true);
    try {
      await unwrapAction(dismissLoanClosedPrompt(loanId));
      done();
    } catch (e) {
      showToast(getErrorMessage(e, "Couldn't save that. Try again."), { tone: 'danger' });
    } finally {
      setSaving(false);
    }
  };

  // The loaded loan no longer asks to close: nothing to show (while loading it stays).
  if (evidence === undefined && loaded === null) return null;

  return (
    <ClosePrompt
      className={className}
      title="Is this loan closed?"
      evidence={closeEvidenceLines(evidence === undefined ? loaded : evidence)}
      confirmLabel="Yes, closed"
      busy={busy}
      onConfirm={() => void yes()}
      onDismiss={() => void notYet()}
    />
  );
}

'use client';

import { useQueryClient } from '@tanstack/react-query';
import React from 'react';

import { showToast } from '@/components/ds/Toast/Toast';
import { ClosePrompt } from '@/features/shell/ClosePrompt';
import { unwrapAction } from '@/lib/actionResult';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { keys } from '@/lib/query/keys';
import { useAppRouter } from '@/lib/useAppRouter';

import { useLoanDetailMutations } from './detail/useLoanDetailMutations';
import { dismissLoanClosedPrompt } from './loanActions';

/** "Is this loan closed?" with Yes, closed (the loan's own Close) and Not yet (asks no more). Refreshes after. */
export function LoanClosedPrompt({ loanId, className }: { loanId: string; className?: string }) {
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

  return (
    <ClosePrompt
      className={className}
      title="Is this loan closed?"
      confirmLabel="Yes, closed"
      busy={busy}
      onConfirm={() => void yes()}
      onDismiss={() => void notYet()}
    />
  );
}

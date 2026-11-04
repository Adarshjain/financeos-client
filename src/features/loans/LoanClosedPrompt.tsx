'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import React from 'react';

import { showToast } from '@/components/ds/Toast/Toast';
import { ClosePrompt } from '@/features/shell/ClosePrompt';
import { unwrapAction } from '@/lib/actionResult';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { keys } from '@/lib/query/keys';

import { useLoanDetailMutations } from './detail/useLoanDetailMutations';
import { dismissLoanClosedPrompt } from './loanActions';

/** "Is this loan closed?" with Yes, closed (the loan's own Close) and Not yet (asks no more). Refreshes after. */
export function LoanClosedPrompt({ loanId, className }: { loanId: string; className?: string }) {
  const router = useRouter();
  const qc = useQueryClient();
  const { closeLoan } = useLoanDetailMutations(loanId);
  const [busy, setBusy] = React.useState(false);

  const done = () => {
    void qc.invalidateQueries({ queryKey: keys.obligations.all });
    router.refresh();
  };
  const yes = async () => {
    setBusy(true);
    try {
      await closeLoan();
      done();
    } finally {
      setBusy(false);
    }
  };
  const notYet = async () => {
    setBusy(true);
    try {
      await unwrapAction(dismissLoanClosedPrompt(loanId));
      done();
    } catch (e) {
      showToast(getErrorMessage(e, "Couldn't save that. Try again."), { tone: 'danger' });
    } finally {
      setBusy(false);
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

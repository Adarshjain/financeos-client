'use client';

import { useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import React from 'react';

import { Banner, showToast } from '@/components/ds';
import { getErrorMessage } from '@/lib/api/errorMessage';
import type { LoanMatchSuggestions } from '@/lib/loan.types';
import { keys } from '@/lib/query/keys';

import { postLoanPaymentsBatch } from '../loanPaymentsBatch';
import { matchBanner, paidToast, singleCandidateBatches } from './loansList';

/**
 * "n EMIs aren't marked paid": every installment that has exactly one matching bank debit. Link all
 * records them loan by loan through the batch endpoint, then refreshes the page and says what was marked.
 */
export function LoanMatchBanner({ matches }: { matches: LoanMatchSuggestions[] }) {
  const router = useRouter();
  const qc = useQueryClient();
  const busy = React.useRef(false);
  const banner = matchBanner(matches);
  if (!banner) return null;

  const linkAll = async () => {
    if (busy.current) return;
    busy.current = true;
    let recorded = 0;
    try {
      for (const batch of singleCandidateBatches(matches)) {
        const { created } = await postLoanPaymentsBatch(batch.loanId, { items: batch.items });
        recorded += created;
      }
    } catch (e) {
      showToast(getErrorMessage(e, "Couldn't record batch loan payments. Try again."), { tone: 'danger' });
    } finally {
      busy.current = false;
    }
    if (recorded === 0) return;
    await Promise.all([
      qc.invalidateQueries({ queryKey: keys.loans.all }),
      qc.invalidateQueries({ queryKey: keys.transactions.all }),
    ]);
    showToast(paidToast(recorded));
    router.refresh();
  };

  return (
    <Banner tone="warning" action={{ label: banner.actionLabel, onSelect: () => void linkAll() }}>
      {banner.message}
    </Banner>
  );
}

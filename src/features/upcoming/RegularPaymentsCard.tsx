'use client';

import React from 'react';

import { Button } from '@/components/ds/Button/Button';
import { Card } from '@/components/ds/Card/Card';
import { ListRow } from '@/components/ds/ListRow/ListRow';
import { StatusWord } from '@/components/ds/StatusWords/StatusWords';
import type { RecurringSeriesDto } from '@/lib/api/types';
import { useLazyDialog } from '@/lib/lazy/useLazyDialog';

import { loadLoanFormDialog } from '../loans/lazyDialogs';
import { KIND_WORDS, loanPrefillValues, proposalLine } from './recurringModel';
import { useRecurringActions } from './useRecurringActions';

/** "Regular payments we found": proposed series with Track / Not regular, or Add loan for an EMI. */
export function RegularPaymentsCard({ proposals }: { proposals: RecurringSeriesDto[] }) {
  const actions = useRecurringActions();
  const { Component: LoanFormDialog, run: runLoan } = useLazyDialog(loadLoanFormDialog);
  const [converting, setConverting] = React.useState<RecurringSeriesDto | null>(null);

  if (proposals.length === 0) return null;
  return (
    <>
      <Card title="Regular payments we found">
        {proposals.map((p) => (
          <ListRow
            key={p.id}
            title={p.displayName}
            subtitle={
              <>
                <StatusWord tone="neutral">{KIND_WORDS[p.kind]}</StatusWord>
                {' · '}
                {proposalLine(p)}
              </>
            }
            trailing={
              <>
                {p.kind === 'EMI' ? (
                  <Button variant="secondary" size="sm" onClick={() => void runLoan(() => setConverting(p))}>
                    Add loan
                  </Button>
                ) : (
                  <Button variant="secondary" size="sm" onClick={() => void actions.track(p.id, p.displayName)}>
                    Track
                  </Button>
                )}
                <Button variant="link" size="sm" onClick={() => void actions.dismiss(p.id, p.displayName)}>
                  Not regular
                </Button>
              </>
            }
          />
        ))}
      </Card>
      {converting && LoanFormDialog ? (
        <LoanFormDialog
          prefill={loanPrefillValues(converting)}
          onClose={() => setConverting(null)}
          onCreated={(loan) => actions.converted(converting.id, loan.id)}
        />
      ) : null}
    </>
  );
}

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
  const { Component: LoanFormDialog, run: runLoan, loading: loanLoading } = useLazyDialog(loadLoanFormDialog);
  const [converting, setConverting] = React.useState<RecurringSeriesDto | null>(null);
  // The series being saved and which button was pressed: pending from the press until the list has refreshed.
  const [busy, setBusy] = React.useState<{ id: string; action: 'track' | 'dismiss' } | null>(null);
  const inFlight = React.useRef(false);
  const act = async (id: string, action: 'track' | 'dismiss', call: () => Promise<unknown> | void) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setBusy({ id, action });
    try {
      await call();
    } finally {
      inFlight.current = false;
      setBusy(null);
    }
  };

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
                  <Button variant="secondary" size="sm" loading={loanLoading} disabled={busy?.id === p.id} onClick={() => void runLoan(() => setConverting(p))}>
                    Add loan
                  </Button>
                ) : (
                  <Button
                    variant="secondary"
                    size="sm"
                    loading={busy?.id === p.id && busy.action === 'track'}
                    disabled={busy !== null}
                    onClick={() => void act(p.id, 'track', () => actions.track(p.id, p.displayName))}
                  >
                    Track
                  </Button>
                )}
                <Button
                  variant="link"
                  size="sm"
                  loading={busy?.id === p.id && busy.action === 'dismiss'}
                  disabled={busy !== null}
                  onClick={() => void act(p.id, 'dismiss', () => actions.dismiss(p.id, p.displayName))}
                >
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

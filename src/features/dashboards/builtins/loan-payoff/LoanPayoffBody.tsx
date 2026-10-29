'use client';

// loan_payoff: for each active loan (or the one picked in the widget's params) its name, what's left and a thin bar
// of how much principal is repaid. The amount left opens the loan's breakdown.
// Content only; the dashboard frame draws the card.

import React from 'react';

import { Button, EmptyState, ListRow, ProgressBar, Skeleton } from '@/components/ds';
import { BodyError } from '@/features/dashboards/builtins/investmentsLoansParts';
import { LazyReportRowBreakdownDialog } from '@/features/reports/underlying/LazyReportUnderlyingDialogs';
import { appHref } from '@/features/shell/routes';
import { formatMoney } from '@/lib/format';
import type { LoanResponse } from '@/lib/loan.types';
import { useActiveLoans } from '@/lib/query/hooks/useLoans';

import { principalRepaidPct } from './loanPayoffModel';

/** The widget's loading skeleton: two loans, each a name and figure over a bar. */
export function LoanPayoffSkeleton() {
  return (
    <div data-testid="loan-payoff-loading">
      {[0, 1].map((i) => (
        <div key={i} className="flex flex-col gap-space-8 px-space-16 py-space-10">
          <div className="flex items-center justify-between gap-space-12">
            <Skeleton width="40%" />
            <Skeleton width="25%" />
          </div>
          <Skeleton width="100%" height={6} />
        </div>
      ))}
    </div>
  );
}

function LoanRow({ loan, onOpen }: { loan: LoanResponse; onOpen: (loan: LoanResponse) => void }) {
  const pct = principalRepaidPct(loan);
  return (
    <ListRow
      wrap
      title={loan.name}
      trailing={
        <Button variant="link" onClick={() => onOpen(loan)}>
          {`${formatMoney(loan.outstandingPrincipal)} left`}
        </Button>
      }
    >
      <ProgressBar value={pct} />
    </ListRow>
  );
}

export function LoanPayoffBody({ loanId }: { loanId: string | null }) {
  const { data: loans = [], isLoading, error, refetch } = useActiveLoans();
  const [opened, setOpened] = React.useState<LoanResponse | null>(null);
  const shown = loanId ? loans.filter((l) => l.id === loanId) : loans;

  if (isLoading) return <LoanPayoffSkeleton />;
  if (error) return <BodyError what="your loans" error={error} retry={() => void refetch()} />;
  if (shown.length === 0) {
    return (
      <EmptyState
        compact
        description={loanId ? 'This loan is closed or no longer exists' : 'No active loans yet'}
        action={{ label: 'Go to loans', variant: 'link', href: appHref('/loans') }}
      />
    );
  }
  return (
    <div role="list" aria-label="Loans" data-testid="loan-payoff-widget">
      {shown.map((loan) => (
        <div key={loan.id} role="listitem">
          <LoanRow loan={loan} onOpen={setOpened} />
        </div>
      ))}
      {opened ? (
        <LazyReportRowBreakdownDialog datasource="net_worth" rowId={opened.id} title={opened.name} onClose={() => setOpened(null)} />
      ) : null}
    </div>
  );
}

/** The widget's subtitle: the picked loan's name ("One loan" until the list loads or when it is gone). */
export function LoanNameSubtitle({ loanId }: { loanId: string }) {
  const { data: loans } = useActiveLoans();
  return <>{loans?.find((l) => l.id === loanId)?.name ?? 'One loan'}</>;
}

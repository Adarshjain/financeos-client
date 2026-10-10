'use client';

// loan_payoff: for each active loan (or the one picked in the widget's
// params) what's left, how much principal is repaid, the expected payoff
// date, the interest still to pay and the next EMI. The outstanding figure
// opens the loan's net-worth breakdown.

import { Landmark } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { SubtitleText } from '@/components/dashboards/builtins/BuiltinSubtitle';
import { LazyRowBreakdownDialog } from '@/components/reports/underlying/LazyUnderlyingDialogs';
import { Button } from '@/components/ui/button';
import type { LoanResponse } from '@/lib/loan.types';
import { useActiveLoans } from '@/lib/query/hooks/useLoans';

import {
  DrillValue,
  fullDate,
  ProgressBar,
  rupees,
  WidgetBody,
  WidgetEmpty,
  WidgetLoadError,
  WidgetLoadingRows,
} from '../investmentsLoansKit/kit';

/** Share of the original principal repaid so far, 0–100. */
export function principalRepaidPct(loan: Pick<LoanResponse, 'principal' | 'outstandingPrincipal'>): number {
  if (!(loan.principal > 0)) return 0;
  const pct = ((loan.principal - loan.outstandingPrincipal) / loan.principal) * 100;
  return Math.max(0, Math.min(100, pct));
}

export function LoanPayoffWidget({ loanId, className }: { loanId: string | null; className?: string }) {
  const { data: loans = [], isLoading, error } = useActiveLoans();
  const [opened, setOpened] = useState<LoanResponse | null>(null);
  const shown = loanId ? loans.filter((l) => l.id === loanId) : loans;

  let body;
  if (isLoading) body = <WidgetLoadingRows testId="loan-payoff-loading" />;
  else if (error) body = <WidgetLoadError what="your loans" error={error} />;
  else if (shown.length === 0) {
    body = (
      <WidgetEmpty
        icon={Landmark}
        title={loanId ? 'This loan is closed or no longer exists' : 'No active loans'}
        action={
          <Button asChild variant="link" size="xs">
            <Link href="/loans">Go to loans</Link>
          </Button>
        }
      />
    );
  } else {
    body = (
      <ul className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800" aria-label="Loans">
        {shown.map((loan) => (
          <LoanRow key={loan.id} loan={loan} onOpen={() => setOpened(loan)} />
        ))}
      </ul>
    );
  }

  return (
    <WidgetBody className={className} testId="loan-payoff-widget">
      {body}
      {opened && (
        <LazyRowBreakdownDialog
          datasource="net_worth"
          rowId={opened.id}
          title={opened.name}
          open
          onOpenChange={(o) => !o && setOpened(null)}
        />
      )}
    </WidgetBody>
  );
}

function LoanRow({ loan, onOpen }: { loan: LoanResponse; onOpen: () => void }) {
  const pct = principalRepaidPct(loan);
  const facts = [
    `${Math.round(pct)}% of principal repaid`,
    loan.projectedEndDate ? `paid off by ${fullDate(loan.projectedEndDate)}` : null,
  ].filter(Boolean);
  const nextEmi = loan.nextDueDate
    ? `Next EMI ${rupees(loan.currentEmi)} on ${fullDate(loan.nextDueDate)}`
    : null;
  return (
    <li className="space-y-1.5 px-4 py-2.5">
      <div className="flex items-baseline justify-between gap-3">
        <span className="min-w-0 truncate text-xs font-medium text-slate-800 dark:text-slate-200">{loan.name}</span>
        <DrillValue
          onClick={onOpen}
          label={`view breakdown of ${loan.name}`}
          className="shrink-0 text-xs font-semibold text-slate-900 dark:text-white"
        >
          {rupees(loan.outstandingPrincipal)} left
        </DrillValue>
      </div>
      <ProgressBar pct={pct} label={`${loan.name} principal repaid`} />
      <p className="text-2xs text-slate-500 dark:text-slate-400">{facts.join(' · ')}</p>
      <p className="text-2xs text-slate-500 dark:text-slate-400">
        {rupees(loan.totalInterestRemaining)} interest to go{nextEmi && ` · ${nextEmi}`}
      </p>
    </li>
  );
}

/** The widget's subtitle: the picked loan's name ("One loan" until the list loads or when it is gone). */
export function LoanNameSubtitle({ loanId }: { loanId: string }) {
  const { data: loans } = useActiveLoans();
  return <SubtitleText>{loans?.find((l) => l.id === loanId)?.name ?? 'One loan'}</SubtitleText>;
}

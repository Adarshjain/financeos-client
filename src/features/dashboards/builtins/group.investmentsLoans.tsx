'use client';

// The investments & loans built-ins in Dinero, keyed by builtinKey: each key's body (component built-ins) or
// view (template built-ins), its loading skeleton in the widget's own shape, and its param-aware subtitle.
// The page's frame draws the Widget title, subtitle, header link and ⋮ around these; bodies fetch with the
// same hooks as Legacy and render their own failed state with Retry.
//
// Investments: portfolio_snapshot, top_movers, allocation (a CHART template rendered by the `allocation` view),
// tax_harvest. Loans & lending: loan_payoff, lending_balances. Plus shortcuts.

import { createElement } from 'react';

import { widgetParams } from '@/lib/dashboards.helpers';

import { AllocationSkeleton, AllocationView } from './allocation/AllocationView';
import { LendingBalancesBody, LendingBalancesSkeleton } from './lending-balances/LendingBalancesBody';
import { LoanNameSubtitle, LoanPayoffBody, LoanPayoffSkeleton } from './loan-payoff/LoanPayoffBody';
import { PortfolioSnapshotBody, PortfolioSnapshotSkeleton } from './portfolio-snapshot/PortfolioSnapshotBody';
import { ShortcutsBody, ShortcutsSkeleton } from './shortcuts/ShortcutsBody';
import { shortcutIds } from './shortcuts/shortcutsParamsModel';
import { TaxHarvestBody, TaxHarvestSkeleton } from './tax-harvest/TaxHarvestBody';
import { TopMoversBody, TopMoversSkeleton } from './top-movers/TopMoversBody';
import { moversCount } from './top-movers/topMoversModel';
import type { BuiltinBodyProps, DineroBuiltin } from './types';

export const INVESTMENTS_LOANS_BUILTINS: Readonly<Record<string, DineroBuiltin>> = {
  portfolio_snapshot: {
    flush: true,
    Body: () => <PortfolioSnapshotBody />,
    Skeleton: PortfolioSnapshotSkeleton,
  },
  top_movers: {
    flush: true,
    Body: ({ params }: BuiltinBodyProps) => <TopMoversBody n={moversCount(params.n)} />,
    Skeleton: TopMoversSkeleton,
  },
  allocation: {
    flush: true,
    View: AllocationView,
    Skeleton: AllocationSkeleton,
  },
  tax_harvest: {
    flush: true,
    Body: () => <TaxHarvestBody />,
    Skeleton: TaxHarvestSkeleton,
  },
  loan_payoff: {
    flush: true,
    Body: ({ params }: BuiltinBodyProps) => (
      <LoanPayoffBody loanId={typeof params.loanId === 'string' ? params.loanId : null} />
    ),
    Skeleton: LoanPayoffSkeleton,
    subtitle: (widget) => {
      const loanId = widgetParams(widget).loanId;
      return typeof loanId === 'string' ? createElement(LoanNameSubtitle, { loanId }) : 'All loans';
    },
  },
  lending_balances: {
    flush: true,
    Body: () => <LendingBalancesBody />,
    Skeleton: LendingBalancesSkeleton,
  },
  shortcuts: {
    flush: true,
    Body: ({ params }: BuiltinBodyProps) => <ShortcutsBody ids={shortcutIds(params)} />,
    Skeleton: ShortcutsSkeleton,
  },
};

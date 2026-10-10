'use client';

// Bodies, views and subtitles of this group's built-ins; registry.tsx merges them over the icons.
//
// Investments: portfolio_snapshot, top_movers, allocation (a CHART template
// rendered by the `allocation` view), tax_harvest. Loans & lending:
// loan_payoff, lending_balances. Plus shortcuts (and its params editor).

import { createElement } from 'react';

import { widgetParams } from '@/lib/dashboards.helpers';

import { AllocationView } from '../widgets/allocation/AllocationView';
import { LendingBalancesWidget } from '../widgets/lending_balances/LendingBalancesWidget';
import { LoanNameSubtitle, LoanPayoffWidget } from '../widgets/loan_payoff/LoanPayoffWidget';
import { PortfolioSnapshotWidget } from '../widgets/portfolio_snapshot/PortfolioSnapshotWidget';
import { shortcutIds } from '../widgets/shortcuts/shortcutsParams';
import { ShortcutsParamsEditor } from '../widgets/shortcuts/ShortcutsParamsEditor';
import { ShortcutsWidget } from '../widgets/shortcuts/ShortcutsWidget';
import { TaxHarvestWidget } from '../widgets/tax_harvest/TaxHarvestWidget';
import { moversCount } from '../widgets/top_movers/topMovers';
import { TopMoversWidget } from '../widgets/top_movers/TopMoversWidget';
import type { GroupEntries, GroupViews } from './group.types';
import type { BuiltinBodyProps, PhoneSlot } from './registry';

const CONTENT: PhoneSlot = { fit: 'content' };

export const INVESTMENTS_LOANS_ENTRIES: GroupEntries = {
  portfolio_snapshot: {
    Body: ({ className }: BuiltinBodyProps) => <PortfolioSnapshotWidget className={className} />,
    phone: CONTENT,
  },
  top_movers: {
    Body: ({ params, className }: BuiltinBodyProps) => (
      <TopMoversWidget n={moversCount(params.n)} className={className} />
    ),
    phone: CONTENT,
  },
  allocation: {
    // Donut + legend: shorter than the default chart slot.
    phone: { fit: 'fill', className: 'h-56' },
  },
  tax_harvest: {
    Body: ({ className }: BuiltinBodyProps) => <TaxHarvestWidget className={className} />,
    phone: CONTENT,
  },
  loan_payoff: {
    Body: ({ params, className }: BuiltinBodyProps) => (
      <LoanPayoffWidget loanId={typeof params.loanId === 'string' ? params.loanId : null} className={className} />
    ),
    phone: CONTENT,
    subtitle: (widget) => {
      const loanId = widgetParams(widget).loanId;
      return typeof loanId === 'string' ? createElement(LoanNameSubtitle, { loanId }) : 'All loans';
    },
  },
  lending_balances: {
    Body: ({ className }: BuiltinBodyProps) => <LendingBalancesWidget className={className} />,
    phone: CONTENT,
  },
  shortcuts: {
    Body: ({ params, className }: BuiltinBodyProps) => (
      <ShortcutsWidget ids={shortcutIds(params)} className={className} />
    ),
    phone: CONTENT,
    ParamsEditor: ShortcutsParamsEditor,
  },
};

export const INVESTMENTS_LOANS_VIEWS: GroupViews = {
  allocation: AllocationView,
};

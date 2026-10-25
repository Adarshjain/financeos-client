import { render, screen } from '@testing-library/react';
import { isValidElement } from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('./portfolio_snapshot/PortfolioSnapshotBody', () => ({
  PortfolioSnapshotBody: () => <div data-testid="body" data-which="portfolio" />,
  PortfolioSnapshotSkeleton: () => <div data-testid="skeleton" data-which="portfolio" />,
}));
vi.mock('./top_movers/TopMoversBody', () => ({
  TopMoversBody: ({ n }: { n: number }) => <div data-testid="body" data-which="movers" data-n={n} />,
  TopMoversSkeleton: () => <div data-testid="skeleton" />,
}));
vi.mock('./tax_harvest/TaxHarvestBody', () => ({
  TaxHarvestBody: () => <div data-testid="body" data-which="tax" />,
  TaxHarvestSkeleton: () => <div data-testid="skeleton" />,
}));
vi.mock('./lending_balances/LendingBalancesBody', () => ({
  LendingBalancesBody: () => <div data-testid="body" data-which="lending" />,
  LendingBalancesSkeleton: () => <div data-testid="skeleton" />,
}));
vi.mock('./shortcuts/ShortcutsBody', () => ({
  ShortcutsBody: ({ ids }: { ids: string[] }) => <div data-testid="body" data-which="shortcuts" data-ids={ids.join(',')} />,
  ShortcutsSkeleton: () => <div data-testid="skeleton" />,
}));
vi.mock('./loan_payoff/LoanPayoffBody', () => ({
  LoanPayoffBody: ({ loanId }: { loanId: string | null }) => <div data-testid="body" data-which="loan" data-loan={loanId ?? 'all'} />,
  LoanPayoffSkeleton: () => <div data-testid="skeleton" />,
  LoanNameSubtitle: ({ loanId }: { loanId: string }) => <>{`loan ${loanId}`}</>,
}));
vi.mock('./allocation/AllocationView', () => ({
  AllocationView: () => <div data-testid="view" data-which="allocation" />,
  AllocationSkeleton: () => <div data-testid="skeleton" />,
}));

import type { WidgetResponse } from '@/lib/dashboards.types';

import { INVESTMENTS_LOANS_BUILTINS } from './group.investmentsLoans';
import { DEFAULT_SHORTCUTS } from './shortcuts/shortcutsCatalog';
import type { BuiltinBodyProps } from './types';

const W = {} as WidgetResponse;
const body = (key: string, params: Record<string, unknown> = {}) => {
  const Body = INVESTMENTS_LOANS_BUILTINS[key].Body!;
  return render(<Body {...({ widget: W, params } satisfies BuiltinBodyProps)} />);
};

describe('INVESTMENTS_LOANS_BUILTINS', () => {
  it('covers the seven keys, each with a skeleton; only allocation is a template view', () => {
    expect(Object.keys(INVESTMENTS_LOANS_BUILTINS).sort()).toEqual([
      'allocation', 'lending_balances', 'loan_payoff', 'portfolio_snapshot', 'shortcuts', 'tax_harvest', 'top_movers',
    ]);
    for (const [key, entry] of Object.entries(INVESTMENTS_LOANS_BUILTINS)) {
      expect(entry.Skeleton, key).toBeTruthy();
      expect(Boolean(entry.View), key).toBe(key === 'allocation');
      expect(Boolean(entry.Body), key).toBe(key !== 'allocation');
    }
  });

  it('top_movers passes n clamped to 3–10, default 5', () => {
    for (const [raw, n] of [[undefined, '5'], [7, '7'], [1, '3'], [99, '10'], [4.5, '5']] as const) {
      const { unmount } = body('top_movers', { n: raw });
      expect(screen.getByTestId('body')).toHaveAttribute('data-n', n);
      unmount();
    }
  });

  it('loan_payoff passes the picked loan id or null', () => {
    const { unmount } = body('loan_payoff', { loanId: 'l1' });
    expect(screen.getByTestId('body')).toHaveAttribute('data-loan', 'l1');
    unmount();
    body('loan_payoff', {});
    expect(screen.getByTestId('body')).toHaveAttribute('data-loan', 'all');
  });

  it('loan_payoff subtitle: the picked loan name element, or All loans', () => {
    const subtitle = INVESTMENTS_LOANS_BUILTINS.loan_payoff.subtitle!;
    const picked = subtitle({ params: { loanId: 'l1' } } as unknown as WidgetResponse);
    expect(isValidElement(picked)).toBe(true);
    expect(subtitle({ params: {} } as unknown as WidgetResponse)).toBe('All loans');
  });

  it('shortcuts passes the stored ids, else the defaults', () => {
    const { unmount } = body('shortcuts', { items: ['page:/upcoming'] });
    expect(screen.getByTestId('body')).toHaveAttribute('data-ids', 'page:/upcoming');
    unmount();
    body('shortcuts', {});
    expect(screen.getByTestId('body')).toHaveAttribute('data-ids', DEFAULT_SHORTCUTS.join(','));
  });

  it('portfolio_snapshot, tax_harvest and lending_balances render their bodies', () => {
    for (const [key, which] of [['portfolio_snapshot', 'portfolio'], ['tax_harvest', 'tax'], ['lending_balances', 'lending']]) {
      const { unmount } = body(key);
      expect(screen.getByTestId('body')).toHaveAttribute('data-which', which);
      unmount();
    }
  });

  it('allocation is the view', () => {
    const View = INVESTMENTS_LOANS_BUILTINS.allocation.View!;
    render(<View widget={W} data={{} as never} onPageChange={() => {}} onSizeChange={() => {}} />);
    expect(screen.getByTestId('view')).toHaveAttribute('data-which', 'allocation');
  });
});

import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { RuleMatchesCardList } from '@/components/rules/matches/RuleMatchesCardList';
import { RuleMatchesTable } from '@/components/rules/matches/RuleMatchesTable';
import type { CategoryRule, RuleMatchTransaction } from '@/lib/rules.types';

const rule = { id: 'r1', merchantKey: 'swiggy' } as CategoryRule;

const debit: RuleMatchTransaction = {
  id: 't1',
  date: '2026-10-05',
  amount: 250,
  type: 'DEBIT',
  sourcedDescription: 'UPI/SWIGGY/ORDER 123',
  categories: [{ id: 'c1', name: 'Food' } as RuleMatchTransaction['categories'][number]],
  reviewType: null,
  appliedRuleId: 'r1',
  appliedRuleName: 'Swiggy',
};

const credit: RuleMatchTransaction = {
  ...debit,
  id: 't2',
  amount: 100,
  type: 'CREDIT',
  sourcedDescription: 'SWIGGY REFUND',
  categories: [],
  appliedRuleId: null,
  appliedRuleName: null,
};

function renderList(overrides: Partial<Parameters<typeof RuleMatchesCardList>[0]> = {}) {
  const props = {
    rows: [debit, credit],
    rule,
    allSelected: false,
    selectedIds: new Set<string>(),
    pageAllChecked: false,
    pageSomeChecked: false,
    onToggleRow: vi.fn(),
    onTogglePage: vi.fn(),
    ...overrides,
  };
  render(<RuleMatchesCardList {...props} />);
  return props;
}

function card(description: string) {
  return screen.getByText(description).closest('label') as HTMLElement;
}

describe('RuleMatchesCardList', () => {
  it('shows each match as a card with date, amount, link label and categories', () => {
    renderList();
    const debitCard = within(card('UPI/SWIGGY/ORDER 123'));
    expect(debitCard.getByText('5 Oct 26')).toBeInTheDocument();
    expect(debitCard.getByText(/^-/)).toHaveTextContent('250');
    expect(debitCard.getByText('(already this rule)')).toBeInTheDocument();
    expect(debitCard.getByText('Food')).toBeInTheDocument();

    const creditCard = within(card('SWIGGY REFUND'));
    expect(creditCard.getByText(/100/).textContent).not.toMatch(/^-/);
    expect(creditCard.getByText('(not linked to a rule)')).toBeInTheDocument();
    expect(creditCard.getByText('Uncategorized')).toBeInTheDocument();
  });

  it('toggles a row from its checkbox or by tapping the card', () => {
    const { onToggleRow } = renderList();
    fireEvent.click(within(card('UPI/SWIGGY/ORDER 123')).getByRole('checkbox'));
    expect(onToggleRow).toHaveBeenLastCalledWith('t1', true);

    fireEvent.click(screen.getByText('SWIGGY REFUND'));
    expect(onToggleRow).toHaveBeenLastCalledWith('t2', true);
    expect(onToggleRow).toHaveBeenCalledTimes(2);
  });

  it('unchecks a selected row', () => {
    const { onToggleRow } = renderList({ selectedIds: new Set(['t1']) });
    const box = within(card('UPI/SWIGGY/ORDER 123')).getByRole('checkbox');
    expect(box).toBeChecked();
    fireEvent.click(box);
    expect(onToggleRow).toHaveBeenCalledWith('t1', false);
  });

  it('checks every card when all matches are selected', () => {
    renderList({ allSelected: true });
    const rowBoxes = screen.getAllByRole('checkbox', { name: 'Select transaction' });
    expect(rowBoxes).toHaveLength(2);
    rowBoxes.forEach((box) => expect(box).toBeChecked());
  });

  it('selects and clears the page from the page checkbox', () => {
    const { onTogglePage } = renderList();
    fireEvent.click(screen.getByRole('checkbox', { name: 'Select all on this page' }));
    expect(onTogglePage).toHaveBeenCalledWith(true);
  });

  it('reflects a partly selected page as indeterminate', () => {
    renderList({ pageSomeChecked: true });
    expect(
      screen.getByRole('checkbox', { name: 'Select all on this page' })
    ).toHaveAttribute('data-state', 'indeterminate');
  });
});

describe('RuleMatchesTable', () => {
  const base = {
    rule,
    allSelected: false,
    selectedIds: new Set<string>(),
    pageAllChecked: false,
    pageSomeChecked: false,
    onToggleRow: vi.fn(),
    onTogglePage: vi.fn(),
  };

  it('renders mobile cards and the desktop table for the same rows', () => {
    const { container } = render(<RuleMatchesTable {...base} loading={false} rows={[debit]} />);
    expect(container.querySelector('.md\\:hidden')).toHaveTextContent('UPI/SWIGGY/ORDER 123');
    expect(container.querySelector('.hidden.md\\:block table')).toHaveTextContent(
      'UPI/SWIGGY/ORDER 123'
    );
  });

  it('shows a loading state instead of either layout', () => {
    render(<RuleMatchesTable {...base} loading rows={[]} />);
    expect(screen.getByText('Finding matches…')).toBeInTheDocument();
    expect(screen.queryByRole('table')).not.toBeInTheDocument();
  });

  it('shows an empty state when nothing matches', () => {
    render(<RuleMatchesTable {...base} loading={false} rows={[]} />);
    expect(screen.getByText("No transactions match this rule's pattern.")).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).not.toBeInTheDocument();
  });
});

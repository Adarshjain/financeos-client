import { fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { ConcealProvider } from '@/components/ds';
import type { RuleMatchTransaction } from '@/lib/rules.types';
import { pinClock } from '@/test/pinClock';

import { MatchRow } from './MatchRow';

pinClock();

const txn = {
  id: 't1',
  date: '2026-10-11',
  amount: 1249,
  type: 'DEBIT',
  sourcedDescription: 'SWIGGY BANGALORE',
  categories: [{ id: 'c1', name: 'Food' }],
  reviewType: null,
  appliedRuleId: null,
  appliedRuleName: null,
  accountName: 'HDFC Regalia',
  cardLast4: '7741',
} as unknown as RuleMatchTransaction;

describe('MatchRow', () => {
  it('reads as a transaction row: description, date, account, category, rule link, amount', () => {
    render(<MatchRow txn={txn} />);
    expect(screen.getByText('SWIGGY BANGALORE')).toBeInTheDocument();
    expect(screen.getByText('11 Oct')).toBeInTheDocument();
    expect(screen.getByText('HDFC Regalia ••7741')).toBeInTheDocument();
    expect(screen.getByText('Food')).toBeInTheDocument();
    expect(screen.getByText('(not linked to a rule)')).toBeInTheDocument();
    expect(screen.queryByRole('checkbox')).toBeNull();
  });

  it('shows Uncategorized when there is no category', () => {
    render(<MatchRow txn={{ ...txn, categories: [] }} />);
    expect(screen.getByText('Uncategorized')).toBeInTheDocument();
  });

  it('a credit reads +amount in the positive tone, hidden amounts never green', () => {
    const credit = { ...txn, type: 'CREDIT' } as RuleMatchTransaction;
    const { rerender } = render(<MatchRow txn={credit} />);
    expect(screen.getByText('+1,249').closest('[role="cell"]')).toHaveClass('text-positive');
    rerender(
      <ConcealProvider concealed>
        <MatchRow txn={credit} />
      </ConcealProvider>,
    );
    expect(screen.getByText('₹ —').closest('[role="cell"]')).not.toHaveClass('text-positive');
  });

  it('with onCheckedChange a press ticks it', () => {
    const onCheckedChange = vi.fn();
    render(<MatchRow txn={txn} checked={false} onCheckedChange={onCheckedChange} />);
    const row = screen.getByRole('checkbox', { name: 'SWIGGY BANGALORE' });
    expect(row).toHaveAttribute('aria-checked', 'false');
    fireEvent.click(row);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it('a selectable row is interactive and toggles once per click or key, never twice', async () => {
    const onCheckedChange = vi.fn();
    const user = userEvent.setup();
    render(<MatchRow txn={txn} checked={false} onCheckedChange={onCheckedChange} />);
    const row = screen.getByRole('checkbox', { name: 'SWIGGY BANGALORE' });
    expect(row).toHaveClass('cursor-pointer');
    await user.click(screen.getByText('SWIGGY BANGALORE'));
    expect(onCheckedChange).toHaveBeenCalledTimes(1);
    row.focus();
    await user.keyboard(' ');
    expect(onCheckedChange).toHaveBeenCalledTimes(2);
    await user.keyboard('{Enter}');
    expect(onCheckedChange).toHaveBeenCalledTimes(3);
  });

  it('a read-only row is not interactive', () => {
    render(<MatchRow txn={txn} />);
    expect(screen.getByText('SWIGGY BANGALORE').closest('[role="row"]')).toBeNull();
  });

  it('Enter on the focused row ticks it', () => {
    const onCheckedChange = vi.fn();
    render(<MatchRow txn={txn} checked onCheckedChange={onCheckedChange} />);
    const row = screen.getByRole('checkbox', { name: 'SWIGGY BANGALORE' });
    row.focus();
    fireEvent.keyDown(row, { key: 'Enter' });
    fireEvent.keyUp(row, { key: 'Enter' });
    expect(onCheckedChange).toHaveBeenCalledWith(false);
  });
});

import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { ConcealProvider } from '@/components/ds';

import { Amount } from './Amount';

describe('Amount', () => {
  it('shows a credit with a plus sign in the positive tone', () => {
    render(<Amount value={46800} direction="credit" />);
    const el = screen.getByText('+₹46,800');
    expect(el.className).toContain('text-positive');
  });

  it('shows a debit plain, whatever the sign of the value', () => {
    render(
      <>
        <Amount value={-24990} direction="debit" />
        <Amount value={3600} direction="debit" data-testid="b" />
      </>,
    );
    expect(screen.getByText('₹24,990').className).not.toContain('text-positive');
    expect(screen.getByTestId('b')).toHaveTextContent('₹3,600');
  });

  it('keeps the value own sign when there is no direction', () => {
    render(<Amount value={-500} />);
    expect(screen.getByText('−₹500').className).not.toContain('text-positive');
  });

  it('shows paise only when there are some (auto) and always with exact', () => {
    render(
      <>
        <Amount value={12.5} direction="debit" />
        <Amount value={12} direction="debit" decimals="exact" data-testid="e" />
      </>,
    );
    expect(screen.getByText('₹12.50')).toBeInTheDocument();
    expect(screen.getByTestId('e')).toHaveTextContent('₹12.00');
  });

  it('leaves the rupee sign off with symbol false', () => {
    render(<Amount value={3600} direction="credit" decimals="exact" symbol={false} />);
    expect(screen.getByText('+3,600.00')).toBeInTheDocument();
  });

  it('puts a prefix before the amount', () => {
    render(<Amount value={44319} direction="debit" prefix="You owe" />);
    expect(screen.getByText('You owe ₹44,319')).toBeInTheDocument();
  });

  it('hides the amount, never green, when the app hides amounts', () => {
    render(
      <ConcealProvider concealed>
        <Amount value={46800} direction="credit" />
      </ConcealProvider>,
    );
    const el = screen.getByText('₹ —');
    expect(el.className).not.toContain('text-positive');
    expect(screen.queryByText(/46,800/)).toBeNull();
  });

  it('the concealed prop hides on its own, without the app switch', () => {
    render(<Amount value={100} direction="credit" concealed />);
    const el = screen.getByText('₹ —');
    expect(el.className).not.toContain('text-positive');
  });
});

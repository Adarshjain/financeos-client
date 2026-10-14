import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { TransactionRow } from './TransactionRow';

describe('TransactionRow', () => {
  it('renders description, amount, balance, account, and provenance', () => {
    render(
      <TransactionRow
        description="BigBasket"
        amount="3,600.00"
        balance="bal ₹61,757"
        account="HDFC Bank Savings"
        provenance="Statement"
        categories={['Groceries']}
      />,
    );

    expect(screen.getByText('BigBasket')).toBeInTheDocument();
    expect(screen.getByText('3,600.00')).toBeInTheDocument();
    expect(screen.getByText('bal ₹61,757')).toBeInTheDocument();
    expect(screen.getByText(/HDFC Bank Savings/)).toBeInTheDocument();
    expect(screen.getByText('Statement')).toBeInTheDocument();
    expect(screen.getByText('Groceries')).toBeInTheDocument();
  });

  it('renders credit amount with positive styling', () => {
    render(
      <TransactionRow
        description="Salary"
        amount="+2,15,000.00"
        categories={['Salary']}
      />,
    );

    const amountEl = screen.getByText('+2,15,000.00');
    expect(amountEl).toHaveClass('text-positive');
  });

  it('renders review reason and plastic card number', () => {
    render(
      <TransactionRow
        description="Swiggy"
        amount="1,249.00"
        account="HDFC Regalia"
        plastic="••7741"
        reviewStatus="Duplicate"
        categories={['Food & dining', 'Delivery']}
      />,
    );

    expect(screen.getByText('HDFC Regalia ••7741')).toBeInTheDocument();
    expect(screen.getByText('Duplicate')).toHaveClass('text-warning');
    expect(screen.getByText('Food & dining')).toBeInTheDocument();
    expect(screen.getByText('+1')).toBeInTheDocument();
  });

  it('renders "Set category" when categories array is empty', () => {
    const handleSet = vi.fn();
    render(
      <TransactionRow
        description="Truffles"
        amount="1,860.00"
        categories={[]}
        onSetCategory={handleSet}
      />,
    );

    const setBtn = screen.getByText('Set category');
    expect(setBtn).toBeInTheDocument();
    fireEvent.click(setBtn);
    expect(handleSet).toHaveBeenCalledTimes(1);
  });

  it('renders selection mode with eye button', () => {
    const handleView = vi.fn();
    render(
      <TransactionRow
        description="Uber India"
        amount="640.00"
        selected
        selectionMode
        onViewDetail={handleView}
      />,
    );

    const eyeBtn = screen.getByRole('button', {
      name: /view transaction details/i,
    });
    expect(eyeBtn).toBeInTheDocument();
    fireEvent.click(eyeBtn);
    expect(handleView).toHaveBeenCalledTimes(1);
  });

  it('applies selected, monitored, and excluded styles', () => {
    const { container: selContainer } = render(
      <TransactionRow
        description="Selected tx"
        amount="100.00"
        status="selected"
      />,
    );
    expect(selContainer.firstChild).toHaveClass('bg-brand-tint');

    const { container: monContainer } = render(
      <TransactionRow
        description="Monitored tx"
        amount="100.00"
        status="monitored"
      />,
    );
    expect(monContainer.firstChild).toHaveClass('bg-watch-tint');

    const { container: excContainer } = render(
      <TransactionRow
        description="Excluded tx"
        amount="100.00"
        status="excluded"
      />,
    );
    expect(excContainer.firstChild).toHaveClass('opacity-60');
  });

  it('triggers onClick callback when row is clicked', () => {
    const handleClick = vi.fn();
    render(
      <TransactionRow
        description="Clickable"
        amount="50.00"
        onClick={handleClick}
      />,
    );

    fireEvent.click(screen.getByText('Clickable'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });
});

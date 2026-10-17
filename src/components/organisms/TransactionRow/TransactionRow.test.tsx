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
        isCredit
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

  it('renders unset category chip when categories array is empty and unsetCategoryLabel provided', () => {
    const handleSet = vi.fn();
    render(
      <TransactionRow
        description="Truffles"
        amount="1,860.00"
        categories={[]}
        unsetCategoryLabel="Set category"
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
        onDetail={handleView}
      />,
    );

    const eyeBtn = screen.getByRole('button', {
      name: /view transaction details/i,
    });
    expect(eyeBtn).toBeInTheDocument();
    fireEvent.click(eyeBtn);
    expect(handleView).toHaveBeenCalledTimes(1);
  });

  it('does not render eye button when outside selection mode even if selectable and onDetail is passed', () => {
    const handleView = vi.fn();
    render(
      <TransactionRow
        description="Swiggy"
        amount="250.00"
        selectable
        selected={false}
        selectionMode={false}
        onDetail={handleView}
      />,
    );
    expect(
      screen.queryByRole('button', { name: 'View details for Swiggy' }),
    ).not.toBeInTheDocument();
  });

  it('applies selected, tone="warning", and disabled styles', () => {
    const { container: selContainer } = render(
      <TransactionRow
        description="Selected tx"
        amount="100.00"
        selected
      />,
    );
    expect(selContainer.firstChild).toHaveClass('bg-brand-tint');

    const { container: monContainer } = render(
      <TransactionRow
        description="Monitored tx"
        amount="100.00"
        tone="warning"
      />,
    );
    expect(monContainer.firstChild).toHaveClass('bg-attention-tint');

    const { container: excContainer } = render(
      <TransactionRow
        description="Excluded tx"
        amount="100.00"
        disabled
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

  it('renders description with text-heading and without font-bold', () => {
    render(
      <TransactionRow
        description="BigBasket"
        amount="3,600.00"
      />,
    );

    const descEl = screen.getByText('BigBasket');
    expect(descEl).toHaveClass('text-heading');
    expect(descEl).not.toHaveClass('font-bold');
  });

  it('renders 4px stripes for selected and warning tone rows', () => {
    const { container: selContainer } = render(
      <TransactionRow
        description="Selected tx"
        amount="100.00"
        selected
      />,
    );
    const selStripe = selContainer.querySelector('.bg-brand');
    expect(selStripe).toHaveClass('w-space-4');

    const { container: monContainer } = render(
      <TransactionRow
        description="Monitored tx"
        amount="100.00"
        tone="warning"
      />,
    );
    const monStripe = monContainer.querySelector('.bg-attention');
    expect(monStripe).toHaveClass('w-space-4');
  });

  it('toggles selection on row tap when selectable', () => {
    const handleSelectedChange = vi.fn();
    render(
      <TransactionRow
        description="Selectable row"
        amount="500.00"
        selectable
        selected={false}
        onSelectedChange={handleSelectedChange}
      />,
    );

    fireEvent.click(screen.getByText('Selectable row'));
    expect(handleSelectedChange).toHaveBeenCalledWith(true);
  });

  it('toggles selection on Enter and Space keys', () => {
    const handleSelectedChange = vi.fn();
    render(
      <TransactionRow
        description="Keyboard row"
        amount="500.00"
        selectable
        selected={true}
        onSelectedChange={handleSelectedChange}
      />,
    );

    const row = screen.getByRole('row');
    fireEvent.keyDown(row, { key: 'Enter' });
    expect(handleSelectedChange).toHaveBeenCalledWith(false);

    fireEvent.keyDown(row, { key: ' ' });
    expect(handleSelectedChange).toHaveBeenCalledWith(false);
  });

  it('starts selection on long-press (~450ms)', () => {
    vi.useFakeTimers();
    const handleSelectedChange = vi.fn();
    const { container } = render(
      <TransactionRow
        description="Long press row"
        amount="500.00"
        selectable
        selected={false}
        onSelectedChange={handleSelectedChange}
      />,
    );

    const row = container.firstChild as HTMLElement;
    fireEvent.touchStart(row, {
      touches: [{ clientX: 100, clientY: 100 }],
    });

    vi.advanceTimersByTime(200);
    expect(handleSelectedChange).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);
    expect(handleSelectedChange).toHaveBeenCalledWith(true);
    vi.useRealTimers();
  });

  it('cancels long-press when movement exceeds 10px', () => {
    vi.useFakeTimers();
    const handleSelectedChange = vi.fn();
    const { container } = render(
      <TransactionRow
        description="Moving row"
        amount="500.00"
        selectable
        selected={false}
        onSelectedChange={handleSelectedChange}
      />,
    );

    const row = container.firstChild as HTMLElement;
    fireEvent.touchStart(row, {
      touches: [{ clientX: 100, clientY: 100 }],
    });

    vi.advanceTimersByTime(200);
    // Move 15px vertically
    fireEvent.touchMove(row, {
      touches: [{ clientX: 100, clientY: 115 }],
    });

    vi.advanceTimersByTime(300);
    expect(handleSelectedChange).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('eye control opens detail without toggling selection', () => {
    const handleDetail = vi.fn();
    const handleSelectedChange = vi.fn();
    render(
      <TransactionRow
        description="Detail row"
        amount="500.00"
        selected
        selectionMode
        onDetail={handleDetail}
        onSelectedChange={handleSelectedChange}
      />,
    );

    const eyeBtn = screen.getByRole('button', {
      name: /view transaction details/i,
    });
    fireEvent.click(eyeBtn);

    expect(handleDetail).toHaveBeenCalledTimes(1);
    expect(handleSelectedChange).not.toHaveBeenCalled();
  });

  it('renders desktop checkbox when selectable on desktop', () => {
    const handleSelectedChange = vi.fn();
    render(
      <TransactionRow
        description="Desktop selectable"
        amount="500.00"
        selectable
        selected={false}
        onSelectedChange={handleSelectedChange}
      />,
    );

    const checkbox = screen.getByLabelText('Select Desktop selectable');
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).not.toBeChecked();

    fireEvent.click(checkbox);
    expect(handleSelectedChange).toHaveBeenCalledWith(true);
  });

  it('renders leading element and trailing chevron', () => {
    const { container } = render(
      <TransactionRow
        leading={<span data-testid="leading-avatar">HD</span>}
        description="Amex bill"
        amount="10,000.00"
        chevron
      />,
    );

    expect(screen.getByTestId('leading-avatar')).toBeInTheDocument();
    const chevronSvg = container.querySelector('svg.w-icon-sm');
    expect(chevronSvg).toBeInTheDocument();
  });

  it('supports uncontrolled selection via defaultSelected', () => {
    const handleSelectedChange = vi.fn();
    render(
      <TransactionRow
        description="Uncontrolled row"
        amount="500.00"
        selectable
        defaultSelected={true}
        onSelectedChange={handleSelectedChange}
      />,
    );

    const checkbox = screen.getByLabelText('Select Uncontrolled row');
    expect(checkbox).toBeChecked();

    fireEvent.click(checkbox);
    expect(handleSelectedChange).toHaveBeenCalledWith(false);
  });
});

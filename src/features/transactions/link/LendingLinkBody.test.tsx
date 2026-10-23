import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { LendingLinkBody } from './LendingLinkBody';
import type { UseRecordLendingResult } from './useRecordLending';

vi.mock('@/features/lendings/form/PersonSelect', () => ({ PersonSelect: () => null }));

function Harness() {
  const [amount, setAmount] = React.useState('');
  const numeric = Number(amount);
  const lending = {
    direction: 'lent',
    entryType: 'lent',
    party: null,
    setParty: vi.fn(),
    setEntryType: vi.fn(),
    amount,
    setAmount,
    amountError: amount.trim() && !(numeric > 0) ? 'Amount must be greater than zero' : undefined,
    entryDate: '2026-10-05',
    setEntryDate: vi.fn(),
    expectedReturnDate: '',
    setExpectedReturnDate: vi.fn(),
    notes: '',
    setNotes: vi.fn(),
  } as unknown as UseRecordLendingResult;
  return (
    <>
      <LendingLinkBody lending={lending} mode="new" onModeChange={vi.fn()} entryId="" onEntryChange={vi.fn()} />
      <output data-testid="state">{amount}</output>
    </>
  );
}

describe('LendingLinkBody amount', () => {
  it('shows the error only after the field loses focus', () => {
    render(<Harness />);
    const field = screen.getByLabelText('Amount');
    fireEvent.change(field, { target: { value: '120+' } });
    expect(screen.queryByText('Amount must be greater than zero')).not.toBeInTheDocument();
    fireEvent.blur(field);
    expect(screen.getByText('Amount must be greater than zero')).toBeInTheDocument();
  });

  it('resolves a sum on blur so it submits as the total', () => {
    render(<Harness />);
    const field = screen.getByLabelText('Amount');
    fireEvent.change(field, { target: { value: '100+50' } });
    fireEvent.blur(field);
    expect(screen.getByTestId('state')).toHaveTextContent('150');
    expect(screen.queryByText('Amount must be greater than zero')).not.toBeInTheDocument();
  });
});

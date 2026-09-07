import { fireEvent, render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { LinkTypeSelector } from '@/components/transactions/link-dialog/LinkTypeSelector';
import type { LinkKind } from '@/lib/transaction.types';

function renderSelector(overrides: Partial<React.ComponentProps<typeof LinkTypeSelector>> = {}) {
  const props: React.ComponentProps<typeof LinkTypeSelector> = {
    kind: 'TRANSFER',
    setKind: vi.fn(),
    note: '',
    setNote: vi.fn(),
    alignRefundCategories: true,
    setAlignRefundCategories: vi.fn(),
    disabledKinds: {},
    ...overrides,
  };
  return { ...render(<LinkTypeSelector {...props} />), props };
}

describe('LinkTypeSelector', () => {
  it('lists all six transaction kinds and both record kinds in the dropdown', () => {
    renderSelector();
    fireEvent.click(screen.getByRole('combobox'));
    const listbox = within(screen.getByRole('listbox'));

    expect(listbox.getByText('Transfer (Bank / Wallet)')).toBeInTheDocument();
    expect(listbox.getByText('Credit Card Bill Payment')).toBeInTheDocument();
    expect(listbox.getByText('Refund / Partial Refund')).toBeInTheDocument();
    expect(listbox.getByText('Reversal')).toBeInTheDocument();
    expect(listbox.getByText('Fee / Surcharge')).toBeInTheDocument();
    expect(listbox.getByText('EMI / Installment')).toBeInTheDocument();
    expect(listbox.getByText('Lending (person ledger)')).toBeInTheDocument();
    expect(listbox.getByText('Loan EMI payment')).toBeInTheDocument();
  });

  it('disables a record kind option in the dropdown when disabledKinds carries a reason', () => {
    renderSelector({ disabledKinds: { LENDING: 'Already linked to a loan record' } });
    fireEvent.click(screen.getByRole('combobox'));
    const listbox = within(screen.getByRole('listbox'));

    const lendingOption = listbox.getByText('Lending (person ledger)').closest('[role="option"]');
    expect(lendingOption).toHaveAttribute('data-disabled');
  });

  it('renders the disabled reason text for a record kind', () => {
    renderSelector({ disabledKinds: { LENDING: 'Already linked to a loan record' } });

    expect(
      screen.getByText('Lending (person ledger): Already linked to a loan record'),
    ).toBeInTheDocument();
  });

  it('renders reason text for both record kinds when both are disabled', () => {
    renderSelector({
      disabledKinds: {
        LENDING: 'Select a single transaction to record a lending or loan payment',
        LOAN_PAYMENT: 'Select a single transaction to record a lending or loan payment',
      },
    });

    expect(
      screen.getByText(
        'Lending (person ledger): Select a single transaction to record a lending or loan payment',
      ),
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Loan EMI payment: Select a single transaction to record a lending or loan payment',
      ),
    ).toBeInTheDocument();
  });

  it('shows the Note input for a transaction kind and hides it for the two record kinds', () => {
    const { rerender } = render(
      <LinkTypeSelector
        kind={'TRANSFER' as LinkKind}
        setKind={vi.fn()}
        note=""
        setNote={vi.fn()}
        alignRefundCategories={true}
        setAlignRefundCategories={vi.fn()}
        disabledKinds={{}}
      />,
    );
    expect(screen.getByText('Note (Optional)')).toBeInTheDocument();

    rerender(
      <LinkTypeSelector
        kind={'LENDING' as LinkKind}
        setKind={vi.fn()}
        note=""
        setNote={vi.fn()}
        alignRefundCategories={true}
        setAlignRefundCategories={vi.fn()}
        disabledKinds={{}}
      />,
    );
    expect(screen.queryByText('Note (Optional)')).not.toBeInTheDocument();

    rerender(
      <LinkTypeSelector
        kind={'LOAN_PAYMENT' as LinkKind}
        setKind={vi.fn()}
        note=""
        setNote={vi.fn()}
        alignRefundCategories={true}
        setAlignRefundCategories={vi.fn()}
        disabledKinds={{}}
      />,
    );
    expect(screen.queryByText('Note (Optional)')).not.toBeInTheDocument();
  });

  it('shows the refund category checkbox only for the REFUND kind', () => {
    const { rerender } = renderSelector({ kind: 'TRANSFER' });
    expect(screen.queryByText(/Align refund category/i)).not.toBeInTheDocument();

    rerender(
      <LinkTypeSelector
        kind="REFUND"
        setKind={vi.fn()}
        note=""
        setNote={vi.fn()}
        alignRefundCategories={true}
        setAlignRefundCategories={vi.fn()}
        disabledKinds={{}}
      />,
    );
    expect(screen.getByText(/Align refund category/i)).toBeInTheDocument();

    rerender(
      <LinkTypeSelector
        kind={'LENDING' as LinkKind}
        setKind={vi.fn()}
        note=""
        setNote={vi.fn()}
        alignRefundCategories={true}
        setAlignRefundCategories={vi.fn()}
        disabledKinds={{}}
      />,
    );
    expect(screen.queryByText(/Align refund category/i)).not.toBeInTheDocument();
  });
});

import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';

// The dialog markup is covered by its own tests; here only the wiring.
vi.mock('@/app/(protected)/loans/lendings/browser/AddLendingDialog', () => ({
  AddLendingDialog: (p: {
    open: boolean;
    onOpenChange: (o: boolean) => void;
    party: { kind: string; counterparty?: { name: string } } | null;
    entryType: string;
    amount: string;
  }) =>
    p.open ? (
      <div data-testid="add-lending">
        <span>{p.party?.counterparty?.name ?? 'nobody'}</span>
        <span>{p.entryType}</span>
        <span>{p.amount || 'no amount'}</span>
        <button onClick={() => p.onOpenChange(false)}>cancel</button>
      </div>
    ) : null,
}));

import { QueryClientProvider } from '@tanstack/react-query';

import { RecordLendingDialog } from '@/components/lendings/RecordLendingDialog';
import type { CounterpartyResponse } from '@/lib/lending.types';
import { createTestQueryClient } from '@/test/renderWithQuery';

const rahul = { id: 'cp1', name: 'Rahul', netPosition: -400 } as CounterpartyResponse;
const withQuery = (ui: ReactNode) => <QueryClientProvider client={createTestQueryClient()}>{ui}</QueryClientProvider>;

describe('RecordLendingDialog', () => {
  it('is controlled by open and starts blank without a preset', () => {
    const { rerender } = render(withQuery(<RecordLendingDialog open={false} onOpenChange={vi.fn()} />));
    expect(screen.queryByTestId('add-lending')).not.toBeInTheDocument();
    rerender(withQuery(<RecordLendingDialog open onOpenChange={vi.fn()} />));
    expect(screen.getByText('nobody')).toBeInTheDocument();
    expect(screen.getByText('lent')).toBeInTheDocument();
    expect(screen.getByText('no amount')).toBeInTheDocument();
  });

  it('opens on the preset (Settle up: the person, repaid_by_me, the amount)', () => {
    render(withQuery(
      <RecordLendingDialog open onOpenChange={vi.fn()} preset={{ counterparty: rahul, entryType: 'repaid_by_me', amount: 400 }} />,
    ));
    expect(screen.getByText('Rahul')).toBeInTheDocument();
    expect(screen.getByText('repaid_by_me')).toBeInTheDocument();
    expect(screen.getByText('400')).toBeInTheDocument();
  });

  it('passes the dialog`s own close to the caller', () => {
    const onOpenChange = vi.fn();
    render(withQuery(<RecordLendingDialog open onOpenChange={onOpenChange} />));
    fireEvent.click(screen.getByText('cancel'));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});

import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});
vi.mock('@/components/ui/select', async () => (await import('@/test/mockSelect')).selectMock);
vi.mock('@/components/transactions/TransactionPicker', () => ({
  TransactionPicker: ({ value }: { value: { id: string } | null }) => (
    <div data-testid="picker">{value ? `chip:${value.id}` : 'search'}</div>
  ),
}));

import { EditDividendDialog } from '@/app/(protected)/investments/EditDividendDialog';
import { renderWithQuery } from '@/test/renderWithQuery';

import { makeDividend } from '../dividend-receipts/__tests__/fixtures';

describe('EditDividendDialog receipt section', () => {
  beforeEach(() => vi.clearAllMocks());

  const open = () => fireEvent.click(screen.getByRole('button'));

  it('renders the Receipt section with the linked chip', () => {
    renderWithQuery(
      <EditDividendDialog
        dividend={makeDividend({
          receiptStatus: 'received',
          transaction: { id: 'tx-1', date: '2026-03-10', signedAmount: 900 },
        })}
      />,
    );
    open();
    expect(screen.getByText('Receipt')).toBeInTheDocument();
    expect(screen.getByText('chip:tx-1')).toBeInTheDocument();
  });

  it('"Use ₹gap as TDS" fills the form TDS field (saved only when the form is saved)', () => {
    renderWithQuery(
      <EditDividendDialog
        dividend={makeDividend({
          amount: 1000,
          tds: undefined,
          receiptStatus: 'received',
          transaction: { id: 'tx-1', date: '2026-03-10', signedAmount: 900 },
        })}
      />,
    );
    open();
    const tds = screen.getByLabelText(/TDS Deducted/i) as HTMLInputElement;
    expect(tds.value).toBe('');
    fireEvent.click(screen.getByRole('button', { name: 'Use ₹100.00 as TDS' }));
    expect(tds.value).toBe('100');
    expect(screen.queryByRole('button', { name: /as TDS/ })).not.toBeInTheDocument();
  });

  it('renders the receipt section outside the edit form (Enter in the picker cannot submit it)', () => {
    renderWithQuery(<EditDividendDialog dividend={makeDividend({ receiptStatus: 'overdue' })} />);
    open();
    const form = document.getElementById('edit-dividend-form')!;
    expect(form).toBeInTheDocument();
    expect(form.contains(screen.getByTestId('picker'))).toBe(false);
    expect(form.contains(screen.getByText('Receipt'))).toBe(false);
  });
});

import { fireEvent, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CardsDialog } from '@/components/accounts/CardsDialog';
import type { BankAccount, CreditCard } from '@/lib/account.types';
import { api } from '@/lib/api/client';
import { AccountType } from '@/lib/types';
import { renderWithQuery } from '@/test/renderWithQuery';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});

const mockBankAccount: BankAccount = {
  id: 'bank-1',
  name: 'HDFC Savings',
  type: AccountType.BANK_ACCOUNT,
};

const mockCreditCardAccount: CreditCard = {
  id: 'cc-1',
  name: 'HDFC Infinia',
  type: AccountType.CREDIT_CARD,
  creditLimit: 500000,
  last4: '1234',
  anniversaryDate: '2026-01-01',
};

describe('CardsDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders bank empty state with "No debit cards yet." and "Add your debit card" button', async () => {
    vi.mocked(api.GET).mockResolvedValue({ data: [] } as never);

    renderWithQuery(
      <CardsDialog
        account={mockBankAccount}
        trigger={<button>Open Cards</button>}
      />
    );

    fireEvent.click(screen.getByText('Open Cards'));

    await waitFor(() => {
      expect(screen.getByText('No debit cards yet.')).toBeInTheDocument();
      expect(screen.getByText('Add your debit card')).toBeInTheDocument();
    });
  });

  it('submits addPrimaryCard when adding primary debit card on bank account', async () => {
    vi.mocked(api.GET).mockResolvedValue({ data: [] } as never);
    vi.mocked(api.POST).mockResolvedValue({
      data: {
        id: 'ch-1',
        accountId: 'bank-1',
        role: 'PRIMARY',
        personName: null,
        openedOn: '2026-09-01',
        cards: [{ id: 'c-1', accountId: 'bank-1', cardholderId: 'ch-1', last4: '5678', issuedOn: '2026-09-01' }],
      },
    } as never);

    renderWithQuery(
      <CardsDialog
        account={mockBankAccount}
        trigger={<button>Open Cards</button>}
      />
    );

    fireEvent.click(screen.getByText('Open Cards'));

    await waitFor(() => {
      expect(screen.getByText('Add your debit card')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Add your debit card'));

    expect(screen.getByLabelText(/Card Last 4 Digits/i)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText(/Card Last 4 Digits/i), { target: { value: '5678' } });
    fireEvent.change(screen.getByLabelText(/Issued On Date/i), { target: { value: '2026-09-01' } });

    fireEvent.click(screen.getByRole('button', { name: 'Add Debit Card' }));

    await waitFor(() => {
      expect(api.POST).toHaveBeenCalledWith('/api/v1/accounts/{accountId}/cardholders/primary', {
        params: { path: { accountId: 'bank-1' } },
        body: { last4: '5678', issuedOn: '2026-09-01' },
      });
    });
  });

  it('renders "Joint holder card" add button for bank accounts when cardholders exist', async () => {
    vi.mocked(api.GET).mockResolvedValue({
      data: [
        {
          id: 'ch-1',
          accountId: 'bank-1',
          role: 'PRIMARY',
          personName: null,
          openedOn: '2026-09-01',
          cards: [{ id: 'c-1', accountId: 'bank-1', cardholderId: 'ch-1', last4: '5678', issuedOn: '2026-09-01' }],
        },
      ],
    } as never);

    renderWithQuery(
      <CardsDialog
        account={mockBankAccount}
        trigger={<button>Open Cards</button>}
      />
    );

    fireEvent.click(screen.getByText('Open Cards'));

    await waitFor(() => {
      expect(screen.getByText('Joint holder card')).toBeInTheDocument();
      expect(screen.getByText('Your card')).toBeInTheDocument();
    });
  });

  it('renders "Add-on Cardholder" add button for credit card accounts', async () => {
    vi.mocked(api.GET).mockResolvedValue({
      data: [
        {
          id: 'ch-1',
          accountId: 'cc-1',
          role: 'PRIMARY',
          personName: null,
          openedOn: '2026-01-01',
          cards: [{ id: 'c-1', accountId: 'cc-1', cardholderId: 'ch-1', last4: '1234', issuedOn: '2026-01-01' }],
        },
      ],
    } as never);

    renderWithQuery(
      <CardsDialog
        account={mockCreditCardAccount}
        trigger={<button>Open Cards</button>}
      />
    );

    fireEvent.click(screen.getByText('Open Cards'));

    await waitFor(() => {
      expect(screen.getByText('Add-on Cardholder')).toBeInTheDocument();
      expect(screen.getByText('Primary Cardholder')).toBeInTheDocument();
    });
  });
});

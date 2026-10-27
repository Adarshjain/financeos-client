import '@/test/next-mocks'; // must be first: AccountFormWrapper calls useRouter()

import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return {
    ...actual,
    api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() },
  };
});

import { AccountsView } from '@/app/(legacy)/legacy/(protected)/accounts/components/AccountsView';
import { api } from '@/lib/api/client';
import { AccountType } from '@/lib/types';
import { renderWithQuery } from '@/test/renderWithQuery';

function bank(id: string, extra: Record<string, unknown>) {
  return { id, name: `Bank ${id}`, type: AccountType.BANK_ACCOUNT, closedOn: null, ...extra };
}

function wallet(id: string, extra: Record<string, unknown>) {
  return { id, name: `Wallet ${id}`, type: AccountType.GENERIC, closedOn: null, ...extra };
}

describe('AccountsView — bank account and wallet totals', () => {
  it("heads the bank section with the open accounts' balances added up on the title line; closed ones left out", async () => {
    vi.mocked(api.GET).mockResolvedValue({
      data: [
        bank('a', { balance: 150000 }),
        // No calculated balance yet: the opening balance counts, as the tile shows it.
        bank('b', { balance: null, openingBalance: '3000' }),
        bank('closed', { balance: 999999, closedOn: '2026-01-01' }),
      ],
    } as never);

    renderWithQuery(<AccountsView />);

    const total = await screen.findByText('Total: ₹1.53L');
    expect(total).toHaveClass('tabular-nums');
    expect(total.parentElement).toContainElement(screen.getByRole('heading', { name: 'Bank Accounts' }));
  });

  it("heads the other-accounts section with the wallets' balances on its title line", async () => {
    vi.mocked(api.GET).mockResolvedValue({
      data: [wallet('w1', { balance: 1200 }), wallet('w2', { balance: 300 }), wallet('gone', { balance: 5000, closedOn: '2026-01-01' })],
    } as never);

    renderWithQuery(<AccountsView />);

    const total = await screen.findByText('Total: ₹1.5K');
    expect(total.parentElement).toContainElement(screen.getByRole('heading', { name: 'Other Accounts' }));
  });

  it('shows no total for a section with no open accounts', async () => {
    vi.mocked(api.GET).mockResolvedValue({ data: [bank('a', { balance: 100 })] } as never);

    renderWithQuery(<AccountsView />);

    expect(await screen.findByText('Total: ₹100')).toBeInTheDocument();
    expect(screen.getAllByText(/^Total: /)).toHaveLength(1);
  });

  it('shows an overdrawn section as a negative total', async () => {
    vi.mocked(api.GET).mockResolvedValue({ data: [bank('a', { balance: 500 }), bank('b', { balance: -2500 })] } as never);

    renderWithQuery(<AccountsView />);

    expect(await screen.findByText('Total: -₹2K')).toBeInTheDocument();
  });
});

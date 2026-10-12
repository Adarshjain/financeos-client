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

import { AccountsView } from '@/app/(protected)/accounts/components/AccountsView';
import { api } from '@/lib/api/client';
import { AccountType } from '@/lib/types';
import { formatMoney } from '@/lib/utils';
import { renderWithQuery } from '@/test/renderWithQuery';

function card(id: string, extra: Record<string, unknown>) {
  return {
    id,
    name: `Card ${id}`,
    type: AccountType.CREDIT_CARD,
    balance: 0,
    last4: '1234',
    closedOn: null,
    cardholders: [],
    ...extra,
  };
}

describe('AccountsView — credit cards outstanding and utilisation', () => {
  it('shows what open cards owe and the utilisation across them; closed cards excluded', async () => {
    vi.mocked(api.GET).mockResolvedValue({
      data: [
        card('a', { creditLimit: 100000, effectiveCreditLimit: 100000, balance: -25000 }),
        card('b', { creditLimit: 100000, effectiveCreditLimit: 100000, balance: -15000 }),
        // In credit: owes nothing.
        card('c', { creditLimit: 200000, effectiveCreditLimit: 200000, balance: 3000 }),
        card('closed', { creditLimit: 500000, effectiveCreditLimit: 500000, balance: -90000, closedOn: '2026-01-01' }),
      ],
    } as never);

    renderWithQuery(<AccountsView />);

    expect(await screen.findByText(`Outstanding: ${formatMoney(40000)}`)).toBeInTheDocument();
    const pct = screen.getByText('10.0%');
    expect(pct).toHaveAttribute('title', 'Utilisation across all cards');
    expect(pct).toHaveClass('text-emerald-600');
  });

  it('tones a high utilisation rose', async () => {
    vi.mocked(api.GET).mockResolvedValue({
      data: [card('a', { creditLimit: 100000, effectiveCreditLimit: 100000, balance: -80000 })],
    } as never);

    renderWithQuery(<AccountsView />);

    expect(await screen.findByText('80.0%')).toHaveClass('text-rose-600');
  });

  it('shows no percent when no card has a limit', async () => {
    vi.mocked(api.GET).mockResolvedValue({
      data: [card('a', { creditLimit: 0, effectiveCreditLimit: null, balance: -5000 })],
    } as never);

    renderWithQuery(<AccountsView />);

    expect(await screen.findByText(`Outstanding: ${formatMoney(5000)}`)).toBeInTheDocument();
    expect(screen.queryByTitle('Utilisation across all cards')).not.toBeInTheDocument();
  });
});

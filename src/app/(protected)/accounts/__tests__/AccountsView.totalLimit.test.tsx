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

describe('AccountsView — credit cards total limit', () => {
  it('sums the limit utilisation uses: effectiveCreditLimit, else creditLimit; closed cards excluded', async () => {
    vi.mocked(api.GET).mockResolvedValue({
      data: [
        // Own limit set: effective equals it.
        card('a', { creditLimit: 100000, effectiveCreditLimit: 100000 }),
        // No own limit: the latest statement's limit counts.
        card('b', { creditLimit: 0, effectiveCreditLimit: 50000 }),
        // An older payload without the field: the own limit counts.
        card('c', { creditLimit: 20000 }),
        // Neither set.
        card('d', { creditLimit: 0, effectiveCreditLimit: null }),
        // Closed: never counts.
        card('e', { creditLimit: 900000, effectiveCreditLimit: 900000, closedOn: '2026-01-01' }),
      ],
    } as never);

    renderWithQuery(<AccountsView />);

    expect(await screen.findByText(`Total Limit: ${formatMoney(170000)}`)).toBeInTheDocument();
  });
});

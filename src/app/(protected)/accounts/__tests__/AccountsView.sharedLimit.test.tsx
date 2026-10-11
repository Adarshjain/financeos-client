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

const pool = (id: string, creditLimit: number) => ({
  id,
  name: `Pool ${id}`,
  creditLimit,
  owed: 0,
  available: creditLimit,
  utilizationPct: 0,
  memberCount: 2,
  openMemberCount: 2,
});

function card(id: string, extra: Record<string, unknown>) {
  return { id, name: `Card ${id}`, type: AccountType.CREDIT_CARD, balance: 0, last4: '1234', closedOn: null, cardholders: [], ...extra };
}

describe('AccountsView — total limit with shared limits', () => {
  it('counts a shared limit once across its open cards, plus unpooled cards; closed cards never count', async () => {
    const hdfc = pool('hdfc', 500000);
    vi.mocked(api.GET).mockResolvedValue({
      data: [
        card('a', { creditLimit: null, effectiveCreditLimit: 500000, limitPool: hdfc }),
        card('b', { creditLimit: 100000, effectiveCreditLimit: 500000, limitPool: hdfc }),
        card('solo', { creditLimit: 100000, effectiveCreditLimit: 100000 }),
        // A closed card in another pool: that pool has no open card here, so it adds nothing.
        card('closed', { creditLimit: null, effectiveCreditLimit: 900000, limitPool: pool('icici', 900000), closedOn: '2026-01-01' }),
      ],
    } as never);

    renderWithQuery(<AccountsView />);

    expect(await screen.findByText(`Total Limit: ${formatMoney(600000)}`)).toBeInTheDocument();
  });
});

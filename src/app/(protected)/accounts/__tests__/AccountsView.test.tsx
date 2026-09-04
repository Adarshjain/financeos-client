import '@/test/next-mocks'; // must be first: AccountFormWrapper calls useRouter() for router.refresh() after save

import { screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return {
    ...actual,
    api: {
      GET: vi.fn(),
      POST: vi.fn(),
      PUT: vi.fn(),
      PATCH: vi.fn(),
      DELETE: vi.fn(),
    },
  };
});


import { AccountsView } from '@/app/(protected)/accounts/components/AccountsView';
import { api } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';
import { AccountType } from '@/lib/types';
import { renderWithQuery } from '@/test/renderWithQuery';

const accountA = {
  id: 'acc-1',
  name: 'Checking Account Primary',
  type: AccountType.BANK_ACCOUNT,
  balance: 50000,
  closedOn: null,
};

const accountB = {
  id: 'acc-2',
  name: 'High Yield Savings New',
  type: AccountType.BANK_ACCOUNT,
  balance: 100000,
  closedOn: null,
};

describe('AccountsView — Query Cache Invalidation Loop', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('updates live when keys.accounts.all is invalidated after mutation', async () => {
    // 1. Initial query returns list A
    vi.mocked(api.GET).mockResolvedValue({ data: [accountA] } as never);

    const { queryClient } = renderWithQuery(<AccountsView />);

    expect(await screen.findByText('Checking Account Primary')).toBeInTheDocument();
    expect(screen.queryByText('High Yield Savings New')).toBeNull();

    // 2. Cache invalidation with list A + B simulates mutation invalidating keys.accounts.all
    vi.mocked(api.GET).mockResolvedValue({ data: [accountA, accountB] } as never);

    await queryClient.invalidateQueries({ queryKey: keys.accounts.all });

    await waitFor(() => {
      expect(screen.getByText('High Yield Savings New')).toBeInTheDocument();
    });
    expect(screen.getByText('Checking Account Primary')).toBeInTheDocument();
  });
});

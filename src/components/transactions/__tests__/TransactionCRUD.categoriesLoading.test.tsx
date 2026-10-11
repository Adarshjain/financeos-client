import { QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { useTransactionCRUD } from '@/components/transactions/crud/useTransactionCRUD';
import type { Account } from '@/lib/account.types';
import { api } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';
import { AccountType } from '@/lib/types';
import { createTestQueryClient } from '@/test/renderWithQuery';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});

const mockAccounts: Account[] = [{ id: 'acc1', name: 'HDFC Savings', type: AccountType.BANK_ACCOUNT }];

// Opening the create dialog before the categories query has data (e.g. from a dashboard
// shortcut) used to loop: the `= []` fallback was a new array on every render, so the first
// re-render (typing the amount) re-fired the category sync effect forever; on a click React
// threw "Maximum update depth exceeded" (#185) and the page showed the error screen.
describe('useTransactionCRUD while categories are still loading', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (api.GET as ReturnType<typeof vi.fn>).mockImplementation(() => new Promise(() => {}));
  });

  it('settles after the amount is typed instead of re-rendering forever', async () => {
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(keys.accounts.list(), mockAccounts);
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );
    let renders = 0;

    const { result } = renderHook(
      () => {
        renders += 1;
        // Break a loop instead of hanging the run.
        if (renders > 50) throw new Error('useTransactionCRUD re-rendered more than 50 times');
        return useTransactionCRUD({});
      },
      { wrapper }
    );
    // Any re-render while categories are pending used to start the loop; typing the amount is the first one.
    const rendersBeforeTyping = renders;
    await act(async () => {
      result.current.setAmount('-321.50');
      await new Promise((r) => setTimeout(r, 50));
    });

    expect(result.current.amount).toBe('-321.50');
    expect(result.current.localCategories).toEqual([]);
    expect(renders - rendersBeforeTyping).toBeLessThan(5);
  });
});

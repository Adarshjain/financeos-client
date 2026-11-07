import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { serverApi as api } from '@/lib/api/server';

import { useAssignNumber } from './useAssignNumber';

vi.mock('next/navigation', async (importOriginal) => ({
  ...(await importOriginal<typeof import('next/navigation')>()),
  useRouter: () => ({ refresh: vi.fn() }),
}));
vi.mock('@/lib/api/server', () => ({ serverApi: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), DELETE: vi.fn() } }));
vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const group = { bank: 'hdfc', last4: '3003', count: 1, firstMail: '2021-05-04T10:00:00Z', lastMail: '2025-04-20T10:00:00Z', kinds: ['ALERT'] } as never;
const active = { id: 'c1', last4: '1111', issuedOn: '2025-05-01', cardholderId: 'h1' };

function setup() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
  return renderHook(() => useAssignNumber(group, vi.fn()), { wrapper });
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(api.GET).mockImplementation((async (url: string, opts?: { params?: { path?: { accountId?: string } } }) => {
    if (url === '/api/v1/accounts')
      return { data: [{ id: 'acc-1', name: 'HDFC Savings', type: 'bank_account' }, { id: 'acc-2', name: 'ICICI Card', type: 'credit_card' }] };
    if (url === '/api/v1/accounts/{accountId}/cardholders')
      return { data: [{ id: 'h1', role: 'PRIMARY', cards: opts?.params?.path?.accountId === 'acc-1' ? [active] : [] }] };
    if (url === '/api/v1/accounts/{accountId}/cards/seen-dates') return { data: { firstSeen: '2021-05-04', lastSeen: '2025-04-20', mailCount: 3, transactionCount: 0 } };
    return { data: [] };
  }) as never);
});

describe('useAssignNumber: another account', () => {
  it('resets the kind and the typed dates when the account changes', async () => {
    const { result } = setup();
    act(() => result.current.selectAccount('acc-1'));
    await waitFor(() => expect(result.current.kind).toBe('card')); // acc-1 has another active card and the number is old
    act(() => result.current.oldCard.setIssuedOn('2020-01-01'));
    expect(result.current.oldCard.issuedOn).toBe('2020-01-01');

    act(() => result.current.selectAccount('acc-2')); // no active card there: nothing suggests an old card
    await waitFor(() => expect(result.current.kind).toBe('number'));
    expect(result.current.oldCard.issuedOn).toBe('2021-05-04'); // the typed date went with the old account

    act(() => result.current.chooseKind('card'));
    act(() => result.current.selectAccount('acc-1'));
    await waitFor(() => expect(result.current.oldCard.issuedOn).toBe('2021-05-04'));
    expect(result.current.kind).toBe('card'); // preselected again for acc-1, not carried over
  });
});

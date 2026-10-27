import { beforeEach, describe, expect, it, vi } from 'vitest';

const notFound = vi.fn(() => {
  throw new Error('NEXT_NOT_FOUND');
});
vi.mock('next/navigation', () => ({ notFound: () => notFound() }));
vi.mock('@/lib/apiClient', () => ({ accountsApi: { get: vi.fn() } }));
vi.mock('@/components/account-detail/AccountDetailView', () => ({ AccountDetailView: () => null }));

import { accountsApi } from '@/lib/apiClient';

import AccountDetailPage from '../page';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('/accounts/[id] page', () => {
  it('calls notFound when the account does not exist (API throws)', async () => {
    vi.mocked(accountsApi.get).mockRejectedValue(new Error('404'));
    await expect(AccountDetailPage({ params: Promise.resolve({ id: 'x' }) })).rejects.toThrow('NEXT_NOT_FOUND');
    expect(accountsApi.get).toHaveBeenCalledWith('x');
  });

  it('calls notFound when the API resolves to null', async () => {
    vi.mocked(accountsApi.get).mockResolvedValue(null as never);
    await expect(AccountDetailPage({ params: Promise.resolve({ id: 'x' }) })).rejects.toThrow('NEXT_NOT_FOUND');
  });

  it('renders the detail view seeded with the fetched account', async () => {
    const account = { id: 'a1', name: 'N', type: 'bank_account' };
    vi.mocked(accountsApi.get).mockResolvedValue(account as never);
    const el: any = await AccountDetailPage({ params: Promise.resolve({ id: 'a1' }) });
    expect(notFound).not.toHaveBeenCalled();
    const view = el.props.children;
    expect(view.props.account).toBe(account);
  });
});

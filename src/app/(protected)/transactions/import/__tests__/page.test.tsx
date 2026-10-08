import { describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/apiClient', () => ({ accountsApi: { list: vi.fn().mockResolvedValue([{ id: 'a' }]) } }));
vi.mock('../IngestForm', () => ({ IngestForm: () => null }));

import IngestPage from '../page';

const form = async (sp?: Record<string, string | string[] | undefined>) => {
  const el: any = await IngestPage({ searchParams: sp ? Promise.resolve(sp) : undefined });
  return el.props.children.props;
};

describe('/transactions/import page', () => {
  it('passes ?account= to the form with the account list', async () => {
    const p = await form({ account: 'a' });
    expect(p.initialAccountId).toBe('a');
    expect(p.initialAccounts).toEqual([{ id: 'a' }]);
  });
  it('uses the first of repeated params', async () => {
    expect((await form({ account: ['x', 'y'] })).initialAccountId).toBe('x');
  });
  it('is undefined without the param or without searchParams', async () => {
    expect((await form({})).initialAccountId).toBeUndefined();
    expect((await form()).initialAccountId).toBeUndefined();
  });
});

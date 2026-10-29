import { beforeEach, describe, expect, it, vi } from 'vitest';

const api = vi.hoisted(() => ({ GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() }));
vi.mock('@/lib/api/server', () => ({ serverApi: api }));
vi.mock('next/cache', () => ({ revalidatePath: vi.fn() }));

import * as actions from './accountActions';

beforeEach(() => {
  vi.clearAllMocks();
  for (const fn of Object.values(api)) fn.mockResolvedValue({ data: { id: 'x' } });
});

const cardholders = '/api/v1/accounts/{accountId}/cardholders';
const card = (acc = 'a1', ch = 'h1', cardId = 'c1') => ({ params: { path: { accountId: acc, cardholderId: ch, cardId } } });

describe('account identifier actions', () => {
  it('loads, adds and removes identifiers', async () => {
    api.GET.mockResolvedValue({ data: undefined });
    expect(await actions.loadAccountIdentifiers('a1')).toEqual({ success: true, data: [] });
    expect(api.GET).toHaveBeenCalledWith('/api/v1/accounts/{id}/identifiers', { params: { path: { id: 'a1' } } });
    await actions.addAccountIdentifier('a1', { value: '1234' });
    expect(api.POST).toHaveBeenCalledWith('/api/v1/accounts/{id}/identifiers', { params: { path: { id: 'a1' } }, body: { value: '1234' } });
    expect(await actions.removeAccountIdentifier('a1', 'i1')).toEqual({ success: true, data: undefined });
    expect(api.DELETE).toHaveBeenCalledWith('/api/v1/accounts/{id}/identifiers/{identifierId}', {
      params: { path: { id: 'a1', identifierId: 'i1' } },
    });
  });
});

describe('account lifecycle actions', () => {
  it('createAccountWithIdentifiers saves the aliases and returns the ones that failed', async () => {
    api.POST.mockImplementation(async (url: string, opts: { body: { value?: string } }) => {
      if (url === '/api/v1/accounts') return { data: { id: 'a9' } };
      if (opts.body.value === 'bad') throw new Error('dup');
      return { data: {} };
    });
    const result = await actions.createAccountWithIdentifiers({ name: 'n' } as never, ['ok', 'bad']);
    expect(result).toEqual({ success: true, data: { account: { id: 'a9' }, failedIdentifiers: ['bad'] } });
    expect(api.POST).toHaveBeenCalledWith('/api/v1/accounts/{id}/identifiers', { params: { path: { id: 'a9' } }, body: { value: 'ok' } });
  });

  it('createAccountWithIdentifiers reports a failed create', async () => {
    api.POST.mockRejectedValue(new Error('down'));
    expect(await actions.createAccountWithIdentifiers({} as never, [])).toMatchObject({
      success: false,
      error: { message: "Couldn't create the account. Try again." },
    });
  });

  it('update, close, reopen and delete the account', async () => {
    await actions.updateAccount('a1', { name: 'n' } as never);
    expect(api.PUT).toHaveBeenCalledWith('/api/v1/accounts/{id}', { params: { path: { id: 'a1' } }, body: { name: 'n' } });
    await actions.closeAccount('a1', { closedOn: '2026-10-01' } as never);
    expect(api.POST).toHaveBeenCalledWith('/api/v1/accounts/{id}/close', { params: { path: { id: 'a1' } }, body: { closedOn: '2026-10-01' } });
    await actions.reopenAccount('a1');
    expect(api.POST).toHaveBeenCalledWith('/api/v1/accounts/{id}/reopen', { params: { path: { id: 'a1' } } });
    await actions.deleteAccount('a1');
    expect(api.DELETE).toHaveBeenCalledWith('/api/v1/accounts/{id}', { params: { path: { id: 'a1' } } });
  });

  it('previews and runs the Gmail cleanup before a date', async () => {
    await actions.previewGmailCleanup('a1', '2026-01-01');
    expect(api.GET).toHaveBeenCalledWith('/api/v1/accounts/{id}/gmail-cleanup-preview', {
      params: { path: { id: 'a1' }, query: { before: '2026-01-01' } },
    });
    await actions.executeGmailCleanup('a1', '2026-01-01');
    expect(api.POST).toHaveBeenCalledWith('/api/v1/accounts/{id}/gmail-cleanup', {
      params: { path: { id: 'a1' }, query: { before: '2026-01-01' } },
    });
  });
});

describe('cardholder and card actions', () => {
  it('loadCardholders returns the list, empty when none', async () => {
    api.GET.mockResolvedValue({ data: undefined });
    expect(await actions.loadCardholders('a1')).toEqual({ success: true, data: [] });
    expect(api.GET).toHaveBeenCalledWith(cardholders, { params: { path: { accountId: 'a1' } } });
  });

  it('adds, updates, closes, reopens and deletes cardholders', async () => {
    await actions.addPrimaryCard('a1', { last4: '1' } as never);
    expect(api.POST).toHaveBeenCalledWith(cardholders + '/primary', { params: { path: { accountId: 'a1' } }, body: { last4: '1' } });
    await actions.addAddonCardholder('a1', { name: 'n' } as never);
    expect(api.POST).toHaveBeenCalledWith(cardholders, { params: { path: { accountId: 'a1' } }, body: { name: 'n' } });
    await actions.updateCardholder('a1', 'h1', { name: 'm' } as never);
    expect(api.PUT).toHaveBeenCalledWith(cardholders + '/{cardholderId}', { params: { path: { accountId: 'a1', cardholderId: 'h1' } }, body: { name: 'm' } });
    await actions.closeCardholder('a1', 'h1', { closedOn: '2026-10-01' });
    expect(api.POST).toHaveBeenCalledWith(cardholders + '/{cardholderId}/close', {
      params: { path: { accountId: 'a1', cardholderId: 'h1' } },
      body: { closedOn: '2026-10-01' },
    });
    await actions.reopenCardholder('a1', 'h1');
    expect(api.POST).toHaveBeenCalledWith(cardholders + '/{cardholderId}/reopen', { params: { path: { accountId: 'a1', cardholderId: 'h1' } } });
    await actions.deleteCardholder('a1', 'h1');
    expect(api.DELETE).toHaveBeenCalledWith(cardholders + '/{cardholderId}', { params: { path: { accountId: 'a1', cardholderId: 'h1' } } });
  });

  it('issues, replaces, closes and deletes plastics', async () => {
    const base = cardholders + '/{cardholderId}/cards';
    await actions.addCard('a1', 'h1', { last4: '2' } as never);
    expect(api.POST).toHaveBeenCalledWith(base, { params: { path: { accountId: 'a1', cardholderId: 'h1' } }, body: { last4: '2' } });
    await actions.replaceCard('a1', 'h1', 'c1', { last4: '3' } as never);
    expect(api.POST).toHaveBeenCalledWith(base + '/{cardId}/replace', { ...card(), body: { last4: '3' } });
    await actions.closeCard('a1', 'h1', 'c1', { closedOn: '2026-10-01' });
    expect(api.POST).toHaveBeenCalledWith(base + '/{cardId}/close', { ...card(), body: { closedOn: '2026-10-01' } });
    await actions.closeCardPlastic('a1', 'h1', 'c1');
    expect(api.POST).toHaveBeenLastCalledWith(base + '/{cardId}/close', card());
    expect(await actions.deleteCardPlastic('a1', 'h1', 'c1')).toEqual({ success: true, data: undefined });
    expect(api.DELETE).toHaveBeenCalledWith(base + '/{cardId}', card());
  });

  it('reattributeTransactionsToCard patches the transactions', async () => {
    api.PATCH.mockResolvedValue({ data: { updatedCount: 3 } });
    expect(await actions.reattributeTransactionsToCard({ ids: ['t'] } as never)).toEqual({ success: true, data: { updatedCount: 3 } });
    expect(api.PATCH).toHaveBeenCalledWith('/api/v1/transactions/card', { body: { ids: ['t'] } });
  });
});

describe('statement actions', () => {
  it('loads statements (empty when none), the card summary (null when none) and one detail', async () => {
    api.GET.mockResolvedValue({ data: undefined });
    expect(await actions.loadAccountStatements('a1')).toEqual({ success: true, data: [] });
    expect(api.GET).toHaveBeenCalledWith('/api/v1/accounts/{accountId}/statements', { params: { path: { accountId: 'a1' } } });
    expect(await actions.loadCardCycleSummary('a1')).toEqual({ success: true, data: null });
    expect(api.GET).toHaveBeenCalledWith('/api/v1/accounts/{id}/card-summary', { params: { path: { id: 'a1' } } });
    await actions.loadStatementDetail('s1');
    expect(api.GET).toHaveBeenCalledWith('/api/v1/statements/{statementId}', { params: { path: { statementId: 's1' } } });
  });

  it('previews and deletes a statement', async () => {
    const params = { params: { path: { accountId: 'a1', statementId: 's1' } } };
    await actions.loadStatementDeletionPreview('a1', 's1');
    expect(api.GET).toHaveBeenCalledWith('/api/v1/accounts/{accountId}/statements/{statementId}/deletion-preview', params);
    api.DELETE.mockResolvedValue({ data: { removed: 2 } });
    expect(await actions.deleteStatement('a1', 's1')).toEqual({ success: true, data: { removed: 2 } });
    expect(api.DELETE).toHaveBeenCalledWith('/api/v1/accounts/{accountId}/statements/{statementId}', params);
  });
});

import { expectStatus } from '../fixtures/api';
import { createBankAccount } from '../fixtures/seed/accounts';
import { createTransaction } from '../fixtures/seed/transactions';
import { expectForeign, newUser, secondUser } from '../fixtures/tenancy';
import { expect, test } from '../fixtures/test';

test.describe('Link suggestions API (@api)', () => {
  test('DELETE dismisses a suggestion: it leaves the list, a second dismiss and an unknown id are 404, another user cannot', async ({ request }) => {
    test.slow();
    const { api } = await newUser(request, 'link-suggestion-dismiss');
    const from = await createBankAccount(api, { name: 'Dismiss From', last4: '3333' });
    const toA = await createBankAccount(api, { name: 'Dismiss To A', last4: '4444' });
    const toB = await createBankAccount(api, { name: 'Dismiss To B', last4: '5555' });
    await createTransaction(api, toA.id, { amount: 9100, description: 'Dismiss in A' });
    await createTransaction(api, toB.id, { amount: 9100, description: 'Dismiss in B' });
    await createTransaction(api, from.id, { amount: -9100, description: 'Dismiss out' });

    // One debit and two equal credits are a suggestion, made in the background after the create.
    const transfers = async () => {
      const res = await api.GET('/api/v1/link-suggestions');
      expectStatus(res, 200);
      return (res.data ?? []).filter((s) => s.kind === 'TRANSFER');
    };
    await expect.poll(async () => (await transfers()).length, { timeout: 45_000 }).toBeGreaterThan(0);
    const [suggestion] = await transfers();

    const { api: other } = await secondUser(request, 'link-suggestion-other');
    expect(await expectForeign(other, 'DELETE', `/api/v1/link-suggestions/${suggestion.id}`)).toBe(404);
    expect((await transfers()).map((s) => s.id)).toContain(suggestion.id);

    const dismissed = await api.DELETE('/api/v1/link-suggestions/{id}', { params: { path: { id: suggestion.id } } });
    expectStatus(dismissed, 204);
    expect((await transfers()).map((s) => s.id)).not.toContain(suggestion.id);

    const again = await api.DELETE('/api/v1/link-suggestions/{id}', { params: { path: { id: suggestion.id } } });
    expect(again.response.status).toBe(404);
    const unknown = await api.DELETE('/api/v1/link-suggestions/{id}', {
      params: { path: { id: '00000000-0000-4000-8000-000000000000' } },
    });
    expect(unknown.response.status).toBe(404);
  });
});

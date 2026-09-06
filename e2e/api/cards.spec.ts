import {
  addCard,
  addCardholder,
  createBankAccount,
  createBrokerAccount,
  createCreditCard,
  createGenericAccount,
  ensurePrimaryCardholder,
} from '../fixtures/seed/accounts';
import { expectForeign, expectUnauthenticated, secondUser } from '../fixtures/tenancy';
import { expect, test } from '../fixtures/test';

test.describe('Cards and Cardholders API (@api)', () => {
  test('bootstrap PRIMARY cardholder on credit card and bank account, second call rejected', async ({
    api,
  }) => {
    // 1. Credit card bootstrap primary
    const cc = await createCreditCard(api, { name: 'CC With Primary' });
    const ccPrimary = await ensurePrimaryCardholder(api, cc.id, '1111', '2025-01-01');
    expect(ccPrimary.role).toBe('PRIMARY');
    expect(ccPrimary.relationship).toBe('SELF');
    expect(ccPrimary.cards.length).toBe(1);
    expect(ccPrimary.cards[0].last4).toBe('4321');
    expect(ccPrimary.cards[0].isOpen).toBe(true);

    // Second primary call on the same account -> rejected with 400
    const ccSecondRes = await api.POST('/api/v1/accounts/{accountId}/cardholders/primary', {
      params: { path: { accountId: cc.id } },
      body: { last4: '2222', issuedOn: '2025-01-02' },
    });
    expect(ccSecondRes.response.status).toBe(400);

    // 2. Bank account bootstrap primary
    const bank = await createBankAccount(api, { name: 'Bank With Primary' });
    const bankPrimary = await ensurePrimaryCardholder(api, bank.id, '3333');
    expect(bankPrimary.role).toBe('PRIMARY');
    expect(bankPrimary.cards.length).toBe(1);
    expect(bankPrimary.cards[0].last4).toBe('3333');

    // Second primary call on bank account -> rejected with 400
    const bankSecondRes = await api.POST('/api/v1/accounts/{accountId}/cardholders/primary', {
      params: { path: { accountId: bank.id } },
      body: { last4: '4444' },
    });
    expect(bankSecondRes.response.status).toBe(400);
  });

  test('cardholder lifecycle: addon on CC, joint on bank, update, close, reopen, delete', async ({
    api,
  }) => {
    const cc = await createCreditCard(api, { name: 'Cardholder Lifecycle CC' });
    await ensurePrimaryCardholder(api, cc.id, '1001');

    // 1. Add ADDON cardholder on credit card
    const addon = await addCardholder(api, cc.id, {
      personName: 'Alex Partner',
      relationship: 'SPOUSE',
      spendLimit: 25000,
      last4: '2002',
    });
    expect(addon.role).toBe('ADDON');
    expect(addon.personName).toBe('Alex Partner');
    expect(addon.relationship).toBe('SPOUSE');
    expect(addon.spendLimit).toBe(25000);
    expect(addon.cards.length).toBe(1);
    expect(addon.cards[0].last4).toBe('2002');

    // 2. Add second ("joint") cardholder on bank account
    const bank = await createBankAccount(api, { name: 'Joint Holder Bank' });
    await ensurePrimaryCardholder(api, bank.id, '3001');
    const joint = await addCardholder(api, bank.id, {
      personName: 'Joint Holder',
      relationship: 'PARENT',
      last4: '4002',
    });
    expect(joint.role).toBe('ADDON');
    expect(joint.personName).toBe('Joint Holder');

    // 3. PUT update cardholder details
    const updateRes = await api.PUT('/api/v1/accounts/{accountId}/cardholders/{cardholderId}', {
      params: { path: { accountId: cc.id, cardholderId: addon.id } },
      body: {
        personName: 'Alex Partner Updated',
        relationship: 'SIBLING',
        spendLimit: 30000,
      },
    });
    expect(updateRes.response.status).toBe(200);
    expect(updateRes.data?.personName).toBe('Alex Partner Updated');
    expect(updateRes.data?.relationship).toBe('SIBLING');
    expect(updateRes.data?.spendLimit).toBe(30000);

    // 4. Close cardholder
    const today = new Date().toISOString().slice(0, 10);
    const closeRes = await api.POST(
      '/api/v1/accounts/{accountId}/cardholders/{cardholderId}/close',
      {
        params: { path: { accountId: cc.id, cardholderId: addon.id } },
        body: { closedOn: today },
      }
    );
    expect(closeRes.response.status).toBe(200);
    expect(closeRes.data?.closedOn).toBe(today);
    expect(closeRes.data?.isEffectivelyClosed).toBe(true);

    // 5. Reopen cardholder
    const reopenRes = await api.POST(
      '/api/v1/accounts/{accountId}/cardholders/{cardholderId}/reopen',
      {
        params: { path: { accountId: cc.id, cardholderId: addon.id } },
      }
    );
    expect(reopenRes.response.status).toBe(200);
    expect(reopenRes.data?.closedOn).toBeNull();
    expect(reopenRes.data?.isEffectivelyClosed).toBe(false);

    // 6. Delete a cardholder with no cards -> 204
    const emptyAddon = await addCardholder(api, cc.id, {
      personName: 'Empty Addon',
      last4: undefined, // no card issued
    });
    const deleteRes = await api.DELETE(
      '/api/v1/accounts/{accountId}/cardholders/{cardholderId}',
      {
        params: { path: { accountId: cc.id, cardholderId: emptyAddon.id } },
      }
    );
    expect(deleteRes.response.status).toBe(204);

    // 7. Delete PRIMARY cardholder -> rejected with 400
    const listRes = await api.GET('/api/v1/accounts/{accountId}/cardholders', {
      params: { path: { accountId: cc.id } },
    });
    const primaryCh = (listRes.data ?? []).find((c) => c.role === 'PRIMARY');
    expect(primaryCh).toBeDefined();

    const delPrimaryRes = await api.DELETE(
      '/api/v1/accounts/{accountId}/cardholders/{cardholderId}',
      {
        params: { path: { accountId: cc.id, cardholderId: primaryCh!.id } },
      }
    );
    expect(delPrimaryRes.response.status).toBe(400);
  });

  test('cards lifecycle: add, one open card rule, replace, close, operations on non-card accounts', async ({
    api,
  }) => {
    const cc = await createCreditCard(api, { name: 'Cards Ops CC' });
    // Create cardholder with no initial card
    const ch = await addCardholder(api, cc.id, {
      personName: 'Plastic Holder',
      last4: undefined,
    });

    // 1. Add card with last4 + issuedOn
    const cardholderWithCard = await addCard(api, cc.id, ch.id, '5555', '2025-01-10');
    expect(cardholderWithCard.cards.length).toBe(1);
    expect(cardholderWithCard.cards[0].last4).toBe('5555');
    expect(cardholderWithCard.cards[0].isOpen).toBe(true);
    const activeCardId = cardholderWithCard.cards[0].id;

    // 2. Add second open card on the same cardholder -> rejected (one open card at a time rule)
    const secondCardRes = await api.POST(
      '/api/v1/accounts/{accountId}/cardholders/{cardholderId}/cards',
      {
        params: { path: { accountId: cc.id, cardholderId: ch.id } },
        body: { last4: '6666' },
      }
    );
    expect(secondCardRes.response.status).toBe(400);

    // 3. Replace card -> old closes, new card created, currentLast4 updates
    const replaceRes = await api.POST(
      '/api/v1/accounts/{accountId}/cardholders/{cardholderId}/cards/{cardId}/replace',
      {
        params: { path: { accountId: cc.id, cardholderId: ch.id, cardId: activeCardId } },
        body: { newLast4: '7777', issuedOn: '2025-02-01' },
      }
    );
    expect(replaceRes.response.status).toBe(200);
    const updatedCh = replaceRes.data!;
    expect(updatedCh.currentLast4).toBe('7777');
    expect(updatedCh.cards.length).toBe(2);

    const oldCard = updatedCh.cards.find((c) => c.id === activeCardId);
    expect(oldCard?.closedOn).toBeTruthy();
    expect(oldCard?.isOpen).toBe(false);

    const newCard = updatedCh.cards.find((c) => c.last4 === '7777');
    expect(newCard?.isOpen).toBe(true);
    expect(newCard?.id).not.toBe(activeCardId);

    // 4. Close the active card
    const closeCardRes = await api.POST(
      '/api/v1/accounts/{accountId}/cardholders/{cardholderId}/cards/{cardId}/close',
      {
        params: { path: { accountId: cc.id, cardholderId: ch.id, cardId: newCard!.id } },
        body: { closedOn: '2025-03-01' },
      }
    );
    expect(closeCardRes.response.status).toBe(200);
    const closedCh = closeCardRes.data!;
    const closedPlastic = closedCh.cards.find((c) => c.id === newCard!.id);
    expect(closedPlastic?.closedOn).toBe('2025-03-01');
    expect(closedPlastic?.isOpen).toBe(false);

    // 5. Card operations rejected on broker and generic accounts -> 400
    const broker = await createBrokerAccount(api, { name: 'No Cards Broker' });
    const generic = await createGenericAccount(api, { name: 'No Cards Wallet' });

    const brokerCardRes = await api.POST(
      '/api/v1/accounts/{accountId}/cardholders/primary',
      {
        params: { path: { accountId: broker.id } },
        body: { last4: '9999' },
      }
    );
    expect(brokerCardRes.response.status).toBe(400);

    const genericCardRes = await api.POST(
      '/api/v1/accounts/{accountId}/cardholders',
      {
        params: { path: { accountId: generic.id } },
        body: { personName: 'Invalid' },
      }
    );
    expect(genericCardRes.response.status).toBe(400);
  });

  test('tenancy: cardholder and card endpoints reject foreign user and unauthenticated', async ({
    api: apiA,
    request,
  }) => {
    const ccA = await createCreditCard(apiA, { name: "User A CC for Tenancy" });
    const chA = await ensurePrimaryCardholder(apiA, ccA.id, '1111');
    const cardIdA = chA.cards[0].id;

    const { api: apiB } = await secondUser(request, 'cards-tenancy');

    const cardEndpoints = [
      {
        method: 'GET' as const,
        path: `/api/v1/accounts/${ccA.id}/cardholders`,
      },
      {
        method: 'POST' as const,
        path: `/api/v1/accounts/${ccA.id}/cardholders`,
        body: { personName: 'Foreign Addon' },
      },
      {
        method: 'POST' as const,
        path: `/api/v1/accounts/${ccA.id}/cardholders/primary`,
        body: { last4: '2222' },
      },
      {
        method: 'PUT' as const,
        path: `/api/v1/accounts/${ccA.id}/cardholders/${chA.id}`,
        body: { personName: 'Hacked Primary' },
      },
      {
        method: 'POST' as const,
        path: `/api/v1/accounts/${ccA.id}/cardholders/${chA.id}/close`,
        body: {},
      },
      {
        method: 'POST' as const,
        path: `/api/v1/accounts/${ccA.id}/cardholders/${chA.id}/reopen`,
        body: {},
      },
      {
        method: 'POST' as const,
        path: `/api/v1/accounts/${ccA.id}/cardholders/${chA.id}/cards`,
        body: { last4: '3333' },
      },
      {
        method: 'POST' as const,
        path: `/api/v1/accounts/${ccA.id}/cardholders/${chA.id}/cards/${cardIdA}/replace`,
        body: { newLast4: '4444' },
      },
      {
        method: 'POST' as const,
        path: `/api/v1/accounts/${ccA.id}/cardholders/${chA.id}/cards/${cardIdA}/close`,
        body: {},
      },
      {
        method: 'DELETE' as const,
        path: `/api/v1/accounts/${ccA.id}/cardholders/${chA.id}`,
      },
    ];

    for (const ep of cardEndpoints) {
      await expectForeign(apiB, ep.method, ep.path, ep.body);
      await expectUnauthenticated(ep.method, ep.path, ep.body);
    }
  });
});

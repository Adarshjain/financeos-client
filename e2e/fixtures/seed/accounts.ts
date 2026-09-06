import type { components } from '../../../src/lib/api/schema.d.ts';
import type { ApiClient } from '../api';

export type BankAccountRequest = components['schemas']['BankAccountRequest'];
export type BankAccountResponse = components['schemas']['BankAccountResponse'];
export type CreditCardRequest = components['schemas']['CreditCardRequest'];
export type CreditCardAccountResponse = components['schemas']['CreditCardAccountResponse'];
export type BrokerRequest = components['schemas']['BrokerRequest'];
export type BrokerAccountResponse = components['schemas']['BrokerAccountResponse'];
export type GenericAccountRequest = components['schemas']['GenericAccountRequest'];
export type GenericAccountResponse = components['schemas']['GenericAccountResponse'];

export type CreateCardholderRequest = components['schemas']['CreateCardholderRequest'];
export type CardholderResponse = components['schemas']['CardholderResponse'];
export type CreateCardRequest = components['schemas']['CreateCardRequest'];

let seedCounter = 0;

export async function createBankAccount(
  api: ApiClient,
  overrides?: Partial<BankAccountRequest>
): Promise<BankAccountResponse> {
  seedCounter += 1;
  const body: BankAccountRequest = {
    type: 'bank_account',
    name: `Test Bank ${seedCounter}`,
    last4: '1234',
    openingBalance: 1000,
    financialPosition: 'asset',
    excludeFromNetAsset: false,
    ...overrides,
  };

  const res = await api.POST('/api/v1/accounts', {
    body,
  });

  if (res.error || !res.data || res.response.status !== 201) {
    throw new Error(
      `createBankAccount failed (${res.response.status}): ${JSON.stringify(res.error ?? res.data)}`
    );
  }

  return res.data as BankAccountResponse;
}

export async function createCreditCard(
  api: ApiClient,
  overrides?: Partial<CreditCardRequest>
): Promise<CreditCardAccountResponse> {
  seedCounter += 1;
  const body: CreditCardRequest = {
    type: 'credit_card',
    name: `Test Credit Card ${seedCounter}`,
    last4: '4321',
    creditLimit: 100000,
    anniversaryDate: new Date().toISOString().slice(0, 10),
    issuer: 'HDFC',
    productName: 'Regalia',
    financialPosition: 'liability',
    excludeFromNetAsset: false,
    ...overrides,
  };

  const res = await api.POST('/api/v1/accounts', {
    body,
  });

  if (res.error || !res.data || res.response.status !== 201) {
    throw new Error(
      `createCreditCard failed (${res.response.status}): ${JSON.stringify(res.error ?? res.data)}`
    );
  }

  return res.data as CreditCardAccountResponse;
}

export async function createBrokerAccount(
  api: ApiClient,
  overrides?: Partial<BrokerRequest>
): Promise<BrokerAccountResponse> {
  seedCounter += 1;
  const body: BrokerRequest = {
    type: 'broker',
    name: `Test Broker ${seedCounter}`,
    provider: 'Zerodha',
    clientId: `CL${seedCounter}`,
    cashBalance: 5000,
    financialPosition: 'asset',
    excludeFromNetAsset: false,
    ...overrides,
  };

  const res = await api.POST('/api/v1/accounts', {
    body,
  });

  if (res.error || !res.data || res.response.status !== 201) {
    throw new Error(
      `createBrokerAccount failed (${res.response.status}): ${JSON.stringify(res.error ?? res.data)}`
    );
  }

  return res.data as BrokerAccountResponse;
}

export async function createGenericAccount(
  api: ApiClient,
  overrides?: Partial<GenericAccountRequest>
): Promise<GenericAccountResponse> {
  seedCounter += 1;
  const body: GenericAccountRequest = {
    type: 'generic',
    name: `Test Wallet ${seedCounter}`,
    financialPosition: 'asset',
    excludeFromNetAsset: false,
    ...overrides,
  };

  const res = await api.POST('/api/v1/accounts', {
    body,
  });

  if (res.error || !res.data || res.response.status !== 201) {
    throw new Error(
      `createGenericAccount failed (${res.response.status}): ${JSON.stringify(res.error ?? res.data)}`
    );
  }

  return res.data as GenericAccountResponse;
}

export async function ensurePrimaryCardholder(
  api: ApiClient,
  accountId: string,
  last4: string = '9999',
  issuedOn?: string
): Promise<CardholderResponse> {
  const listRes = await api.GET('/api/v1/accounts/{accountId}/cardholders', {
    params: { path: { accountId } },
  });
  if (listRes.data) {
    const existingPrimary = listRes.data.find((ch) => ch.role === 'PRIMARY');
    if (existingPrimary) {
      return existingPrimary;
    }
  }

  const body: CreateCardRequest = {
    last4,
    issuedOn: issuedOn ?? new Date().toISOString().slice(0, 10),
  };

  const res = await api.POST('/api/v1/accounts/{accountId}/cardholders/primary', {
    params: { path: { accountId } },
    body,
  });

  if (res.error || !res.data || res.response.status !== 201) {
    throw new Error(
      `ensurePrimaryCardholder failed (${res.response.status}): ${JSON.stringify(res.error ?? res.data)}`
    );
  }

  return res.data;
}

export async function addCardholder(
  api: ApiClient,
  accountId: string,
  overrides?: Partial<CreateCardholderRequest>
): Promise<CardholderResponse> {
  seedCounter += 1;
  const body: CreateCardholderRequest = {
    personName: `Addon User ${seedCounter}`,
    relationship: 'SPOUSE',
    spendLimit: 50000,
    last4: '8888',
    openedOn: new Date().toISOString().slice(0, 10),
    issuedOn: new Date().toISOString().slice(0, 10),
    ...overrides,
  };

  const res = await api.POST('/api/v1/accounts/{accountId}/cardholders', {
    params: { path: { accountId } },
    body,
  });

  if (res.error || !res.data || res.response.status !== 201) {
    throw new Error(
      `addCardholder failed (${res.response.status}): ${JSON.stringify(res.error ?? res.data)}`
    );
  }

  return res.data;
}

export async function addCard(
  api: ApiClient,
  accountId: string,
  cardholderId: string,
  last4: string = '7777',
  issuedOn?: string
): Promise<CardholderResponse> {
  const body: CreateCardRequest = {
    last4,
    issuedOn: issuedOn ?? new Date().toISOString().slice(0, 10),
  };

  const res = await api.POST('/api/v1/accounts/{accountId}/cardholders/{cardholderId}/cards', {
    params: { path: { accountId, cardholderId } },
    body,
  });

  if (res.error || !res.data || res.response.status !== 201) {
    throw new Error(
      `addCard failed (${res.response.status}): ${JSON.stringify(res.error ?? res.data)}`
    );
  }

  return res.data;
}

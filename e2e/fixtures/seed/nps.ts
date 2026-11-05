import type { components } from '../../../src/lib/api/schema.d.ts';
import type { ApiClient } from '../api';
import { createBankAccount } from './accounts';
import { createTransaction } from './transactions';

export type NpsAccountResponse = components['schemas']['NpsSummaryAccount'];
export type NpsSchemeResponse = components['schemas']['NpsSchemeResponse'];

/** The first fund whose Tier I plan has an equity scheme with a NAV: the one every test builds on. */
export async function equityScheme(api: ApiClient): Promise<NpsSchemeResponse> {
  const res = await api.GET('/api/v1/nps/schemes', { params: { query: { tier: 'I' } } });
  const found = ((res.data ?? []) as NpsSchemeResponse[]).find((s) => s.assetClass === 'E' && s.nav != null);
  if (!found) throw new Error('No Tier I equity scheme with a NAV in the NPS catalog');
  return found;
}

/** An account with all of Tier I in the equity scheme, so nothing else has to exist in the catalog. */
export async function createNpsAccount(api: ApiClient, scheme: NpsSchemeResponse, pran = '110022334821'): Promise<NpsAccountResponse> {
  const created = await api.POST('/api/v1/nps/accounts', {
    body: { pran, holderName: 'Me', relation: 'SELF', sector: 'ALL_CITIZEN', cra: 'PROTEAN', readGmail: false, schemeChoice: 'Active' },
  });
  if (!created.data || created.response.status >= 300) throw new Error(`createNpsAccount failed (${created.response.status}): ${JSON.stringify(created.error)}`);
  const allocated = await api.PUT('/api/v1/nps/accounts/{id}/allocation', {
    params: { path: { id: created.data.id } },
    body: { tier: 'I', choice: 'Active', rows: [{ schemeCode: scheme.schemeCode, percent: 100 }] },
  });
  if (!allocated.data || allocated.response.status >= 300) throw new Error(`replaceNpsAllocation failed (${allocated.response.status}): ${JSON.stringify(allocated.error)}`);
  return allocated.data;
}

/** A bank debit that reads like an NPS payment, old enough for the Inbox to offer it, with no contribution to match. */
export async function seedNpsBankDebit(api: ApiClient, date: string, amount = 5000, description = 'RAZORPAY*NPS TRUST') {
  const bank = await createBankAccount(api, { name: 'NPS Bank' });
  const debit = await createTransaction(api, bank.id, { amount: -amount, date, description });
  return { bank, debit };
}

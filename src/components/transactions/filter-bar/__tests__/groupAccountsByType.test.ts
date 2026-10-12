import { describe, expect, it } from 'vitest';

import { groupAccountsByType } from '@/components/transactions/filter-bar/filterBar.helpers';
import type { Account } from '@/lib/account.types';

const acc = (id: string, type: string | undefined) => ({ id, name: id, type }) as unknown as Account;

describe('groupAccountsByType', () => {
  it('orders known types bank → card → broker → generic with title-case labels, keeping input order within a group', () => {
    const groups = groupAccountsByType([
      acc('g1', 'generic'),
      acc('c1', 'credit_card'),
      acc('b1', 'bank_account'),
      acc('k1', 'broker'),
      acc('b2', 'bank_account'),
    ]);

    expect(groups.map((g) => [g.label, g.accounts.map((a) => a.id)])).toEqual([
      ['Bank Account', ['b1', 'b2']],
      ['Credit Card', ['c1']],
      ['Broker', ['k1']],
      ['Generic', ['g1']],
    ]);
  });

  it('drops empty groups', () => {
    expect(groupAccountsByType([acc('c1', 'credit_card')]).map((g) => g.type)).toEqual(['credit_card']);
    expect(groupAccountsByType([])).toEqual([]);
  });

  it('trails unlisted types after the known ones, labelled via getAccountTypeLabel', () => {
    const groups = groupAccountsByType([acc('x1', 'loan'), acc('b1', 'bank_account'), acc('u1', undefined)]);

    expect(groups.map((g) => g.label)).toEqual(['Bank Account', 'Loan', 'Other']);
  });
});

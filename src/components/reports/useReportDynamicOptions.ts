'use client';

import { useMemo } from 'react';

import type { ComboboxOption } from '@/components/Combobox';
import type { DynamicOptions } from '@/components/reports/catalog';
import type { Account } from '@/lib/account.types';
import type { Category } from '@/lib/categories.types';
import { useAccounts } from '@/lib/query/hooks/useAccounts';
import { useCategories } from '@/lib/query/hooks/useCategories';
import { useInstruments } from '@/lib/query/hooks/useInvestments';
import type { Instrument } from '@/lib/types';

export function useReportDynamicOptions(): DynamicOptions {
  const { data: categories = [] } = useCategories();
  const { data: accounts = [] } = useAccounts();
  const { data: instruments = [] } = useInstruments();

  return useMemo(() => {
    return {
      category: categories.map((c: Category): ComboboxOption => ({ id: c.id, name: c.name })),
      account: accounts.map((a: Account): ComboboxOption => ({
        id: a.id,
        name: a.closedOn ? `${a.name} (Closed)` : a.name,
      })),
      broker: accounts
        .filter((a: Account) => a.type === 'broker')
        .map((a: Account): ComboboxOption => ({
          id: a.id,
          name: a.closedOn ? `${a.name} (Closed)` : a.name,
        })),
      instrument: instruments.map((i: Instrument): ComboboxOption => ({ id: i.id, name: i.name })),
    };
  }, [categories, accounts, instruments]);
}

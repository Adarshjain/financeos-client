'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Receipt } from 'lucide-react';

import { TransactionCard } from '@/components/transactions/TransactionCard';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { type Account } from '@/lib/account.types';
import { api } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';
import { type Transaction } from '@/lib/transaction.types';

import { SectionCard } from './SectionCard';

const PAGE_SIZE = 20;

export function AccountRecentTransactions({ account }: { account: Account }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: keys.transactions.search({ accountId: account.id, page: 0, size: PAGE_SIZE }),
    queryFn: async () => {
      const { data } = await api.POST('/api/v1/transactions/search', {
        body: { filters: [{ field: 'accountId', operator: 'is', value: account.id }] },
        params: { query: { page: 0, size: PAGE_SIZE, sort: ['date,desc'] } },
      });
      return data ?? null;
    },
  });
  const items = (data?.content ?? []) as unknown as Transaction[];

  return (
    <SectionCard
      icon={<Receipt />}
      title="Recent transactions"
      subtitle={items.length > 0 ? `Latest ${items.length}` : undefined}
      // Rows carry their own horizontal padding and dividers; the body keeps only the bottom inset.
      bodyClassName="px-0 sm:px-0 pb-2 sm:pb-2"
    >
      {isLoading ? (
        <div className="px-4 pb-2 sm:px-5">
          <Skeleton className="h-40 w-full" />
        </div>
      ) : items.length === 0 ? (
        <div className="px-4 pb-2 sm:px-5">
          <EmptyState compact title="No transactions yet" />
        </div>
      ) : (
        <div className="border-t border-slate-100 dark:border-slate-800">
          {items.map((t) => (
            <TransactionCard
              key={t.id}
              transaction={t}
              accounts={[account]}
              // Flat rows inside the section: no per-row card chrome, a hairline between rows.
              className="px-4 py-3 sm:mb-0 sm:rounded-none sm:px-5 sm:py-3 sm:shadow-none border-slate-100 last:border-b-0 dark:border-slate-800"
              onMutate={() => qc.invalidateQueries({ queryKey: keys.transactions.all })}
            />
          ))}
        </div>
      )}
    </SectionCard>
  );
}

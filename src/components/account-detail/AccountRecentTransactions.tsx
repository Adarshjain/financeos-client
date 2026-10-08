'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';

import { TransactionCard } from '@/components/transactions/TransactionCard';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState } from '@/components/ui/empty-state';
import { Skeleton } from '@/components/ui/skeleton';
import { type Account } from '@/lib/account.types';
import { api } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';
import { type Transaction } from '@/lib/transaction.types';

export function AccountRecentTransactions({ account }: { account: Account }) {
  const qc = useQueryClient();
  const { data, isLoading } = useQuery({
    queryKey: keys.transactions.search({ accountId: account.id, page: 0, size: 20 }),
    queryFn: async () => {
      const { data } = await api.POST('/api/v1/transactions/search', {
        body: { filters: [{ field: 'accountId', operator: 'is', value: account.id }] },
        params: { query: { page: 0, size: 20, sort: ['date,desc'] } },
      });
      return data ?? null;
    },
  });
  const items = (data?.content ?? []) as unknown as Transaction[];

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base">Recent transactions</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1">
        {isLoading ? (
          <Skeleton className="h-40 w-full" />
        ) : items.length === 0 ? (
          <EmptyState compact title="No transactions yet" />
        ) : (
          items.map((t) => (
            <TransactionCard
              key={t.id}
              transaction={t}
              accounts={[account]}
              onMutate={() => qc.invalidateQueries({ queryKey: keys.transactions.all })}
            />
          ))
        )}
      </CardContent>
    </Card>
  );
}

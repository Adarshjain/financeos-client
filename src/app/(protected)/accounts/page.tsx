import { dehydrate, HydrationBoundary } from '@tanstack/react-query';
import { Plus } from 'lucide-react';

import { AccountFormWrapper } from '@/components/accounts/AccountFormWrapper';
import { buttonVariants } from '@/components/ui/button';
import { accountsApi } from '@/lib/apiClient';
import { getQueryClient, keys } from '@/lib/query';
import { cn } from '@/lib/utils';

import { AccountsView } from './components/AccountsView';

export default async function AccountsPage() {
  const accounts = await accountsApi.list();
  const queryClient = getQueryClient();
  queryClient.setQueryData(keys.accounts.list(), accounts);

  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      <div className="p-4 pb-24 space-y-3 max-w-7xl mx-auto">
        {/* Header Dashboard section */}
        <div className="flex justify-between items-center gap-4">
          <div className="space-y-1">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Accounts</h1>
          </div>
          <div className="flex items-center gap-3">
            <AccountFormWrapper triggerClassName={cn(buttonVariants(), 'shrink-0')}>
              <Plus className="w-4 h-4" />
              Add Account
            </AccountFormWrapper>
          </div>
        </div>

        <AccountsView />
      </div>
    </HydrationBoundary>
  );
}

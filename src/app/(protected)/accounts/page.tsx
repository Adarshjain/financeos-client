import Link from 'next/link';
import { JSX } from 'react';

import { EditAccountForm } from '@/app/(protected)/accounts/EditAccountForm';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataList, DataListItem, DataListLabel, DataListRow, DataListValue } from '@/components/ui/data-list';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Account, BankAccount, CreditCard } from '@/lib/account.types';
import { accountsApi } from '@/lib/apiClient';
import { formatMoney, getAccountTypeLabel, getPositionLabel } from '@/lib/utils';

import { CreateAccountForm } from './CreateAccountForm';

export default async function AccountsPage() {
  const accounts = await accountsApi.list();

  const bankAccounts = accounts.filter(a => a.type === 'bank_account') as BankAccount[];
  const creditCards = accounts.filter(a => a.type === 'credit_card') as CreditCard[];
  // const others = accounts.filter(a => !['bank_account', 'credit_card'].includes(a.type));

  const CardWrapper = ({ account, children }: { account: Account; children: JSX.Element[] }) => {
    return <div className="border rounded-md flex w-full border-b p-2 gap-2 bg-white flex-col">
      {children}
      <EditAccountForm account={account} trigger={<Button variant="secondary">Edit</Button>} />
    </div>;
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Accounts</h1>
        <CreateAccountForm />
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {accounts.length === 0 ? (
          <Card>
            <div className="text-center py-12">
              <p className="text-slate-600 dark:text-slate-400 mb-2">
                No accounts yet
              </p>
              <p className="text-sm text-slate-500">
                Add your first account to get started!
              </p>
            </div>
          </Card>
        ) : (
          <>
            <div className="gap-2 flex flex-col">
              <div className="font-bold">Bank Accounts</div>
              {bankAccounts.map((account) => (
                <CardWrapper account={account} key={account.id}>
                  <div className="flex justify-between">
                    <div className="flex gap-2">
                      <div className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {account.name}
                      </div>
                      <Badge
                        variant={account.financialPosition === 'liability' ? 'danger' : 'success'}>
                        {getPositionLabel(account.financialPosition)}
                      </Badge>
                    </div>
                    <div><span className="text-muted-foreground">••••</span> {account.last4}</div>
                  </div>
                  <div className="flex justify-between">
                    <div>{account.description}</div>
                    <div>{formatMoney(account.openingBalance)}</div>
                  </div>
                </CardWrapper>
              ))}
            </div>
            <div className="gap-2 flex flex-col">
              <div className="font-bold">Cards</div>
              {creditCards.map((account) => (
                <CardWrapper account={account} key={account.id}>
                  <div className="flex justify-between">
                    <div className="flex gap-2">
                      <div className="font-semibold text-emerald-600 dark:text-emerald-400">
                        {account.name}
                      </div>
                      <Badge
                        variant={account.financialPosition === 'liability' ? 'danger' : 'success'}>
                        {getPositionLabel(account.financialPosition)}
                      </Badge>
                    </div>
                    <div><span className="text-muted-foreground">••••</span> {account.last4}</div>
                  </div>
                  <div className="flex justify-between">
                    <div>{account.description}</div>
                    <div>{formatMoney(account.creditLimit)}</div>
                  </div>
                  <div className="h-[1px] w-full bg-gray-300"></div>
                  <div className="flex justify-between">
                    <div>Grace Period: {account.gracePeriodDays} days</div>
                    <div>Payment Date: {account.paymentDueDay}</div>
                  </div>
                </CardWrapper>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

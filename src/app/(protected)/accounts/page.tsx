import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataList, DataListItem, DataListLabel, DataListRow, DataListValue } from '@/components/ui/data-list';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { BankAccount, CreditCard } from '@/lib/account.types';
import { accountsApi } from '@/lib/api-client';
import { formatMoney, getAccountTypeLabel, getPositionLabel } from '@/lib/utils';

import { CreateAccountForm } from './create-account-form';

export default async function AccountsPage() {
  const accounts = await accountsApi.list();

  const bankAccounts = accounts.filter(a => a.type === 'bank_account') as BankAccount[];
  const creditCards = accounts.filter(a => a.type === 'credit_card') as CreditCard[];
  const others = accounts.filter(a => !['bank_account', 'credit_card'].includes(a.type));

  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
            Accounts
          </h1>
        </div>
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
            {/* Mobile View */}
            <div className="lg:hidden">
              <div className="gap-2 flex flex-col">
                <div className="font-bold">Bank Accounts</div>
                {bankAccounts.map((account) => (
                  <Link
                    href={`/accounts/${account.id}`}
                    key={account.id}
                    className="border rounded-md flex w-full border-b p-2 gap-2 bg-white flex-col"
                  >
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
                  </Link>
                ))}
              </div>
              <div className="gap-2 flex flex-col mt-6">
                <div className="font-bold">Cards</div>
                {creditCards.map((account) => (
                  <Link
                    href={`/accounts/${account.id}`}
                    key={account.id}
                    className="border rounded-md flex w-full border-b p-2 gap-2 bg-white flex-col"
                  >
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
                  </Link>
                ))}
              </div>
            </div>

            {/* Desktop View */}
            <div className="hidden lg:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Position</TableHead>
                    <TableHead>Description</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {accounts.map((account) => (
                    <TableRow key={account.id}>
                      <TableCell>
                        <Link
                          href={`/accounts/${account.id}`}
                          className="text-emerald-600 dark:text-emerald-400 hover:underline font-medium"
                        >
                          {account.name}
                        </Link>
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">
                          {getAccountTypeLabel(account.type)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            account.financialPosition === 'liability'
                              ? 'danger'
                              : 'success'
                          }
                        >
                          {getPositionLabel(account.financialPosition)}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {account.description || '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

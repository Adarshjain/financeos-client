import Link from 'next/link';

import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { DataList, DataListItem, DataListLabel, DataListRow, DataListValue } from '@/components/ui/data-list';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { accountsApi } from '@/lib/api-client';
import { getAccountTypeLabel, getPositionLabel } from '@/lib/utils';

import { CreateAccountForm } from './create-account-form';

export default async function AccountsPage() {
  const accounts = await accountsApi.list();

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
        <Card>
          <CardHeader>
            <CardTitle>Your Accounts ({accounts.length})</CardTitle>
          </CardHeader>
          <CardContent>
            {accounts.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-slate-600 dark:text-slate-400 mb-2">
                  No accounts yet
                </p>
                <p className="text-sm text-slate-500">
                  Add your first account to get started!
                </p>
              </div>
            ) : (
              <>
                {/* Mobile View */}
                <div className="lg:hidden">
                  <DataList>
                    {accounts.map((account) => (
                      <DataListItem key={account.id}>
                        <Link
                          href={`/accounts/${account.id}`}
                          className="block"
                        >
                          <DataListRow>
                            <DataListLabel>Account</DataListLabel>
                            <DataListValue className="font-semibold text-emerald-600 dark:text-emerald-400">
                              {account.name}
                            </DataListValue>
                          </DataListRow>
                          <DataListRow>
                            <DataListLabel>Type</DataListLabel>
                            <DataListValue>
                              <Badge variant="secondary">
                                {getAccountTypeLabel(account.type)}
                              </Badge>
                            </DataListValue>
                          </DataListRow>
                          <DataListRow>
                            <DataListLabel>Position</DataListLabel>
                            <DataListValue>
                              <Badge
                                variant={
                                  account.financialPosition === 'liability'
                                    ? 'danger'
                                    : 'success'
                                }
                              >
                                {getPositionLabel(account.financialPosition)}
                              </Badge>
                            </DataListValue>
                          </DataListRow>
                          {account.description && (
                            <DataListRow>
                              <DataListLabel>Description</DataListLabel>
                              <DataListValue className="text-slate-600 dark:text-slate-400">
                                {account.description}
                              </DataListValue>
                            </DataListRow>
                          )}
                        </Link>
                      </DataListItem>
                    ))}
                  </DataList>
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
                          <TableCell className="text-slate-600 dark:text-slate-400">
                            {account.description || '—'}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

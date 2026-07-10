import {
  Calendar,
  CreditCard as CardIcon,
  Edit,
  Landmark,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import { JSX } from 'react';

import { AccountFormWrapper } from '@/components/accounts/AccountFormWrapper';
import { DeleteAccount } from '@/components/accounts/DeleteAccount';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Account, BankAccount, CreditCard } from '@/lib/account.types';
import { accountsApi } from '@/lib/apiClient';
import { AccountType } from '@/lib/types';
import { formatMoney, getPositionLabel } from '@/lib/utils';
import { cn } from '@/lib/utils';

function getOrdinalDay(day: number): string {
  if (day >= 11 && day <= 13) {
    return `${day}th`;
  }
  switch (day % 10) {
    case 1:
      return `${day}st`;
    case 2:
      return `${day}nd`;
    case 3:
      return `${day}rd`;
    default:
      return `${day}th`;
  }
}

export default async function AccountsPage() {
  const accounts = await accountsApi.list();

  const bankAccounts = accounts.filter(a => a.type === AccountType.BANK_ACCOUNT) as BankAccount[];
  const creditCards = accounts.filter(a => a.type === AccountType.CREDIT_CARD) as CreditCard[];

  const totalCreditLimit = creditCards.reduce(
    (sum, a) => sum + (a.creditLimit || 0),
    0,
  );

  const AccountWrapper = ({ account, children }: { account: Account; children: JSX.Element }) => {
    return (
      <div
        className="group relative bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-sm hover:shadow-md hover:border-slate-200 dark:hover:border-slate-700/50 hover:-translate-y-0.5 transition-all duration-300 flex w-full flex-col overflow-hidden">
        {/* Top visual accent line */}
        <div className={cn(
          'h-1 w-full',
          account.type === AccountType.BANK_ACCOUNT ? 'bg-emerald-500' : 'bg-amber-500',
        )}></div>

        <div className="p-4 flex-1 flex flex-col justify-between gap-3">
          {children}
        </div>

        {/* Actions Row */}
        <div
          className="flex border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/20 divide-x divide-slate-100 dark:divide-slate-800/65">
          <AccountFormWrapper
            account={account}
            trigger={
              <button
                className="flex-1 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100/30 dark:hover:bg-slate-800/20 transition-all flex items-center justify-center gap-1.5">
                <Edit className="w-3.5 h-3.5" />
                Edit
              </button>
            }
          />
          <DeleteAccount
            account={account}
            trigger={
              <button
                className="flex-1 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-red-650 dark:hover:text-red-400 hover:bg-slate-100/30 dark:hover:bg-slate-800/20 transition-all flex items-center justify-center gap-1.5">
                <Trash2 className="w-3.5 h-3.5" />
                Delete
              </button>
            }
          />
        </div>
      </div>
    );
  };

  return (
    <div className="p-6 pb-24 space-y-8 max-w-7xl mx-auto">
      {/* Header Dashboard section */}
      <div className="flex justify-between items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Accounts</h1>
        </div>
        <AccountFormWrapper
          trigger={
            <Button
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold flex items-center gap-1 px-4 py-2 text-xs shadow-sm shrink-0">
              <Plus className="w-4 h-4" />
              Add Account
            </Button>
          }
        />
      </div>


      {accounts.length === 0 ? (
        <Card className="border-dashed border-slate-200 dark:border-slate-800 max-w-md mx-auto">
          <div className="text-center py-12 px-6 space-y-4">
            <div
              className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-950 flex items-center justify-center mx-auto text-slate-400">
              <Landmark className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                No accounts connected yet
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Add your first bank account or credit card to monitor transactions and track net assets.
              </p>
            </div>
            <AccountFormWrapper
              trigger={
                <Button
                  className="bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold px-4 py-2">
                  Get Started
                </Button>
              }
            />
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Bank Accounts Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800/60">
              <div className="flex items-center gap-2">
                <Landmark className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-450" />
                <h2 className="text-sm font-bold text-slate-800 dark:text-slate-255">Bank Accounts</h2>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-955/40 text-emerald-650 dark:text-emerald-450">
                  {bankAccounts.length}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4">
              {bankAccounts.map((account) => (
                <AccountWrapper account={account} key={account.id}>
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-start gap-2">
                      <div className="space-y-0.5">
                        <div
                          className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          {account.name}
                        </div>
                        {account.description ? (
                          <div className="text-[11px] text-slate-400 dark:text-slate-500 line-clamp-1">
                            {account.description}
                          </div>
                        ) : null}
                      </div>

                      {account.last4 ? (
                        <span
                          className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded shrink-0">
                          •••• {account.last4}
                        </span>
                      ) : null}
                    </div>

                    {/* Metadata Badges */}
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <Badge variant={account.financialPosition === 'liability' ? 'warning' : 'success'}
                             className="text-[9px] py-0 px-2 font-semibold uppercase">
                        {getPositionLabel(account.financialPosition)}
                      </Badge>
                      {account.excludeFromNetAsset ? (
                        <Badge variant="destructive" className="text-[9px] py-0 px-2 font-semibold uppercase">
                          Excluded
                        </Badge>
                      ) : null}
                      {account.ingestFromDate ? (
                        <Badge variant="info"
                               className="text-[9px] py-0 px-2 font-semibold uppercase flex items-center gap-1">
                          <RefreshCw className="w-2.5 h-2.5 animate-spin-slow" />
                          Sync Active
                        </Badge>
                      ) : null}
                    </div>

                    <div
                      className="pt-2 flex justify-between items-baseline border-t border-dashed border-slate-100 dark:border-slate-800/40">
                      <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">Balance</span>
                      <span className="text-lg font-extrabold text-slate-900 dark:text-white font-mono tracking-tight">
                        {formatMoney(account.openingBalance)}
                      </span>
                    </div>

                    {account.ingestFromDate ? (
                      <div className="text-[9px] text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-1">
                        <Calendar className="w-3 h-3 text-slate-350 dark:text-slate-600" />
                        <span>Gmail Sync Watermark: {new Date(account.ingestFromDate).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</span>
                      </div>
                    ) : null}
                  </div>
                </AccountWrapper>
              ))}
              {bankAccounts.length === 0 && (
                <div className="text-center py-6 text-xs text-slate-400 border border-dashed rounded-xl">
                  No bank accounts added.
                </div>
              )}
            </div>
          </div>

          {/* Credit Cards Section */}
          <div className="space-y-4">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800/60">
              <div className="flex items-center gap-2">
                <CardIcon className="w-4.5 h-4.5 text-amber-600 dark:text-amber-450" />
                <h2 className="text-sm font-bold text-slate-800 dark:text-slate-255">Credit Cards</h2>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-955/40 text-amber-650 dark:text-amber-450">
                  {creditCards.length}
                </span>
              </div>
              <span className="text-[11px] text-slate-550 dark:text-slate-400 font-semibold font-mono">
                Total Limit: {formatMoney(totalCreditLimit)}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4">
              {creditCards.map((account) => (
                <AccountWrapper account={account} key={account.id}>
                  <div className="space-y-2.5">
                    <div className="flex justify-between items-start gap-2">
                      <div className="space-y-0.5">
                        <div
                          className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-amber-600 dark:group-hover:text-amber-400 transition-colors">
                          {account.name}
                        </div>
                        {account.description ? (
                          <div className="text-[11px] text-slate-400 dark:text-slate-500 line-clamp-1">
                            {account.description}
                          </div>
                        ) : null}
                      </div>

                      <span
                        className="text-[10px] font-mono bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded shrink-0">
                        •••• {account.last4}
                      </span>
                    </div>

                    {/* Metadata Badges */}
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <Badge variant={account.financialPosition === 'asset' ? 'success' : 'warning'}
                             className="text-[9px] py-0 px-2 font-semibold uppercase">
                        {getPositionLabel(account.financialPosition)}
                      </Badge>
                      {account.excludeFromNetAsset ? (
                        <Badge variant="destructive" className="text-[9px] py-0 px-2 font-semibold uppercase">
                          Excluded
                        </Badge>
                      ) : null}
                      {account.ingestFromDate ? (
                        <Badge variant="info"
                               className="text-[9px] py-0 px-2 font-semibold uppercase flex items-center gap-1">
                          <RefreshCw className="w-2.5 h-2.5 animate-spin-slow" />
                          Sync Active
                        </Badge>
                      ) : null}
                    </div>

                    {/* Stats & Credit Limits */}
                    <div
                      className="pt-2 flex justify-between items-baseline border-t border-dashed border-slate-100 dark:border-slate-800/40">
                      <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">Credit Limit</span>
                      <span className="text-lg font-bold text-slate-900 dark:text-white font-mono tracking-tight">
                        {formatMoney(account.creditLimit)}
                      </span>
                    </div>

                    <div
                      className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-50 dark:border-slate-800/30 text-[10px] text-slate-500 dark:text-slate-400">
                      <div className="flex flex-col">
                        <span className="text-[9px] text-slate-400">Due Date</span>
                        <span
                          className="font-semibold text-slate-700 dark:text-slate-350">{getOrdinalDay(account.paymentDueDay)} of every month</span>
                      </div>
                      <div className="flex flex-col text-right">
                        <span className="text-[9px] text-slate-400">Grace Period</span>
                        <span
                          className="font-semibold text-slate-700 dark:text-slate-350">{account.gracePeriodDays} Days</span>
                      </div>
                    </div>

                    {account.ingestFromDate ? (
                      <div className="text-[9px] text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-1">
                        <Calendar className="w-3 h-3 text-slate-350 dark:text-slate-600" />
                        <span>Gmail Sync Watermark: {new Date(account.ingestFromDate).toLocaleDateString('en-IN', { dateStyle: 'medium' })}</span>
                      </div>
                    ) : null}
                  </div>
                </AccountWrapper>
              ))}
              {creditCards.length === 0 && (
                <div className="text-center py-6 text-xs text-slate-400 border border-dashed rounded-xl">
                  No credit cards added.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

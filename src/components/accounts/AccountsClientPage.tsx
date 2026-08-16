'use client';

import {
  Calendar,
  CreditCard as CardIcon,
  Edit,
  FileText,
  Landmark,
  Plus,
  RefreshCw,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import { useState } from 'react';

import { AccountFormWrapper } from '@/components/accounts/AccountFormWrapper';
import { DeleteAccount } from '@/components/accounts/DeleteAccount';
import { StatementsDialog } from '@/components/accounts/StatementsDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Account, isAccountOfType } from '@/lib/account.types';
import { AccountStatus, AccountType } from '@/lib/types';
import { formatDate, formatMoney, getPositionLabel } from '@/lib/utils';
import { cn } from '@/lib/utils';

const AccountWrapper = ({ account, children }: { account: Account; children: React.ReactNode }) => {
  return (
    <div
      className={cn(
        "group relative bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-sm hover:shadow-md hover:border-slate-200 dark:hover:border-slate-700/50 hover:-translate-y-0.5 transition-all duration-300 flex w-full flex-col overflow-hidden",
        account.status === AccountStatus.CLOSED && "opacity-75 bg-slate-50/50 dark:bg-slate-950/40 border-dashed"
      )}>
      {/* Top visual accent line */}
      <div className={cn(
        'h-1 w-full',
        account.status === AccountStatus.CLOSED
          ? 'bg-slate-400 dark:bg-slate-600'
          : account.type === AccountType.BANK_ACCOUNT
            ? 'bg-emerald-500'
            : account.type === AccountType.CREDIT_CARD
              ? 'bg-amber-500'
              : account.type === AccountType.BROKER
                ? 'bg-blue-500'
                : 'bg-purple-500',
      )}></div>

      <div className="p-3 flex-1 flex flex-col justify-between gap-2">
        {children}
      </div>

      {/* Actions Row */}
      <div
        className="flex border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/20 divide-x divide-slate-100 dark:divide-slate-800/65">
        <StatementsDialog
          account={account}
          trigger={
            <button
              type="button"
              className="flex-1 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100/30 dark:hover:bg-slate-800/20 transition-all flex items-center justify-center gap-1.5">
              <FileText className="w-3.5 h-3.5" />
              Statements
            </button>
          }
        />
        <AccountFormWrapper
          account={account}
          trigger={
            <button
              type="button"
              className="flex-1 py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100/30 dark:hover:bg-slate-800/20 transition-all flex items-center justify-center gap-1.5">
              <Edit className="w-3.5 h-3.5" />
              Edit
            </button>
          }
        />
        <DeleteAccount account={account} />
      </div>
    </div>
  );
};

export default function AccountsClientPage({ accounts }: { accounts: Account[] }) {
  const [showClosed, setShowClosed] = useState(false);

  const visibleAccounts = showClosed
    ? accounts
    : accounts.filter((a) => a.status !== AccountStatus.CLOSED);

  const bankAccounts = visibleAccounts.filter(isAccountOfType(AccountType.BANK_ACCOUNT));
  const creditCards = visibleAccounts.filter(isAccountOfType(AccountType.CREDIT_CARD));
  const brokerAccounts = visibleAccounts.filter(isAccountOfType(AccountType.BROKER));
  const genericAccounts = visibleAccounts.filter(isAccountOfType(AccountType.GENERIC));

  const totalCreditLimit = creditCards.reduce(
    (sum, a) => sum + (a.creditLimit || 0),
    0,
  );

  const hasClosedAccounts = accounts.some((a) => a.status === AccountStatus.CLOSED);

  return (
    <div className="p-6 pb-24 space-y-8 max-w-7xl mx-auto">
      {/* Header Dashboard section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">Accounts</h1>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto justify-between sm:justify-end">
          {hasClosedAccounts && (
            <label className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={showClosed}
                onChange={(e) => setShowClosed(e.target.checked)}
                className="rounded border-slate-300 dark:border-slate-700 text-emerald-600 focus:ring-emerald-500"
              />
              Show closed accounts
            </label>
          )}
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
      </div>

      {accounts.length === 0 ? (
        <Card className="border-dashed border-slate-200 dark:border-slate-800 max-w-md mx-auto">
          <div className="text-center py-12 px-6 space-y-2">
            <div
              className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-950 flex items-center justify-center mx-auto text-slate-400">
              <Landmark className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-slate-900 dark:text-white">
                No accounts connected yet
              </p>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Add your first bank account, credit card, or cash wallet to monitor transactions and track net assets.
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
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {/* Bank Accounts Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800/60">
              <div className="flex items-center gap-2">
                <Landmark className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">Bank Accounts</h2>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                  {bankAccounts.length}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {bankAccounts.map((account) => (
                <AccountWrapper account={account} key={account.id}>
                  <div className="space-y-1">
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
                          className="text-[10px] tabular-nums bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded shrink-0">
                          •••• {account.last4}
                        </span>
                      ) : null}
                    </div>

                    {/* Metadata Badges */}
                    <div className="flex flex-wrap gap-1.5 items-center">
                      {account.status === AccountStatus.CLOSED && (
                        <Badge variant="outline" className="text-[9px] py-0 px-1.5 font-semibold text-slate-500 border-slate-300 dark:border-slate-700">
                          Closed {account.closedOn ? `(${account.closedOn})` : ''}
                        </Badge>
                      )}
                      <Badge variant={account.financialPosition === 'liability' ? 'warning' : 'success'}
                             className="text-[9px] py-0 px-2 font-semibold uppercase">
                        {getPositionLabel(account.financialPosition)}
                      </Badge>
                      {account.excludeFromNetAsset ? (
                        <Badge variant="destructive" className="text-[9px] py-0 px-2 font-semibold uppercase">
                          Excluded
                        </Badge>
                      ) : null}
                    </div>

                    <div
                      className="pt-2 flex flex-col gap-1 border-t border-dashed border-slate-100 dark:border-slate-800/40">
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">Balance</span>
                        <span className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight tabular-nums">
                          {formatMoney(account.balance ?? account.openingBalance)}
                        </span>
                      </div>
                    </div>
                  </div>
                </AccountWrapper>
              ))}
              {bankAccounts.length === 0 && (
                <div className="text-center py-6 text-xs text-slate-400 border border-dashed rounded-xl">
                  No bank accounts.
                </div>
              )}
            </div>
          </div>

          {/* Credit Cards Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800/60">
              <div className="flex items-center gap-2">
                <CardIcon className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">Credit Cards</h2>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                  {creditCards.length}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {creditCards.map((account) => (
                <AccountWrapper account={account} key={account.id}>
                  <div className="space-y-1">
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
                        className="text-[10px] tabular-nums bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded shrink-0">
                        •••• {account.last4}
                      </span>
                    </div>

                    {/* Metadata Badges */}
                    <div className="flex flex-wrap gap-1.5 items-center">
                      {account.status === AccountStatus.CLOSED && (
                        <Badge variant="outline" className="text-[9px] py-0 px-1.5 font-semibold text-slate-500 border-slate-300 dark:border-slate-700">
                          Closed {account.closedOn ? `(${account.closedOn})` : ''}
                        </Badge>
                      )}
                      <Badge variant={account.financialPosition === 'asset' ? 'success' : 'warning'}
                             className="text-[9px] py-0 px-2 font-semibold uppercase">
                        {getPositionLabel(account.financialPosition)}
                      </Badge>
                    </div>

                    <div
                      className="pt-2 flex flex-col gap-1 border-t border-dashed border-slate-100 dark:border-slate-800/40">
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">Limit</span>
                        <span className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight tabular-nums">
                          {formatMoney(account.creditLimit)}
                        </span>
                      </div>
                    </div>
                  </div>
                </AccountWrapper>
              ))}
              {creditCards.length === 0 && (
                <div className="text-center py-6 text-xs text-slate-400 border border-dashed rounded-xl">
                  No credit cards.
                </div>
              )}
            </div>
          </div>

          {/* Broker Accounts Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800/60">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">Brokers</h2>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                  {brokerAccounts.length}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {brokerAccounts.map((account) => (
                <AccountWrapper account={account} key={account.id}>
                  <div className="space-y-1">
                    <div className="flex justify-between items-start gap-2">
                      <div className="space-y-0.5">
                        <div
                          className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {account.name}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 items-center">
                      {account.status === AccountStatus.CLOSED && (
                        <Badge variant="outline" className="text-[9px] py-0 px-1.5 font-semibold text-slate-500 border-slate-300 dark:border-slate-700">
                          Closed {account.closedOn ? `(${account.closedOn})` : ''}
                        </Badge>
                      )}
                    </div>

                    <div
                      className="pt-2 flex flex-col gap-1 border-t border-dashed border-slate-100 dark:border-slate-800/40">
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">Cash Balance</span>
                        <span className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight tabular-nums">
                          {formatMoney(account.cashBalance ?? 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                </AccountWrapper>
              ))}
              {brokerAccounts.length === 0 && (
                <div className="text-center py-6 text-xs text-slate-400 border border-dashed rounded-xl">
                  No broker accounts.
                </div>
              )}
            </div>
          </div>

          {/* Generic Accounts Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800/60">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">Wallets & Others</h2>
                <span
                  className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
                  {genericAccounts.length}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {genericAccounts.map((account) => (
                <AccountWrapper account={account} key={account.id}>
                  <div className="space-y-1">
                    <div className="flex justify-between items-start gap-2">
                      <div className="space-y-0.5">
                        <div
                          className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                          {account.name}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 items-center">
                      {account.status === AccountStatus.CLOSED && (
                        <Badge variant="outline" className="text-[9px] py-0 px-1.5 font-semibold text-slate-500 border-slate-300 dark:border-slate-700">
                          Closed {account.closedOn ? `(${account.closedOn})` : ''}
                        </Badge>
                      )}
                    </div>

                    <div
                      className="pt-2 flex flex-col gap-1 border-t border-dashed border-slate-100 dark:border-slate-800/40">
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">Balance</span>
                        <span className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight tabular-nums">
                          {formatMoney(account.balance ?? 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                </AccountWrapper>
              ))}
              {genericAccounts.length === 0 && (
                <div className="text-center py-6 text-xs text-slate-400 border border-dashed rounded-xl">
                  No generic accounts.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

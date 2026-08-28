import {
  Calendar,
  CreditCard as CardIcon,
  FileText,
  Landmark,
  Plus,
  RefreshCw,
  TrendingUp,
  Wallet,
} from 'lucide-react';

import { AccountFormWrapper } from '@/components/accounts/AccountFormWrapper';
import { CardsDialog } from '@/components/accounts/CardsDialog';
import { StatementsDialog } from '@/components/accounts/StatementsDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Account, isAccountOfType } from '@/lib/account.types';
import { accountsApi } from '@/lib/apiClient';
import { AccountType } from '@/lib/types';
import { formatDate, formatMoney, formatNullableMoney, getPositionLabel } from '@/lib/utils';
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

const AccountWrapper = ({ account, children }: { account: Account; children: React.ReactNode }) => {
  return (
    <div
      className="group relative bg-white dark:bg-slate-900/60 rounded-2xl border border-slate-100 dark:border-slate-800/80 shadow-sm hover:shadow-md hover:border-slate-200 dark:hover:border-slate-700/50 hover:-translate-y-0.5 transition-all duration-300 flex w-full flex-col overflow-hidden">
      {/* Top visual accent line */}
      <div className={cn(
        'h-1 w-full',
        account.type === AccountType.BANK_ACCOUNT
          ? 'bg-emerald-500'
          : account.type === AccountType.CREDIT_CARD
            ? 'bg-amber-500'
            : account.type === AccountType.BROKER
              ? 'bg-blue-500'
              : 'bg-purple-500',
      )}></div>

      {/* Main card body is clickable trigger for editing the account */}
      <AccountFormWrapper
        account={account}
        trigger={
          <div
            role="button"
            tabIndex={0}
            className="p-3.5 flex-1 flex flex-col justify-between gap-2 text-left cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/20 transition-colors select-none"
          >
            {children}
          </div>
        }
      />

      {/* Actions Row: Only Statements and Cards */}
      <div
        className="flex border-t border-slate-100 dark:border-slate-800/60 bg-slate-50/50 dark:bg-slate-950/20 divide-x divide-slate-100 dark:divide-slate-800/65">
        <StatementsDialog
          account={account}
          trigger={
            <button
              type="button"
              suppressHydrationWarning
              className="flex-1 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-blue-600 dark:hover:text-blue-400 hover:bg-slate-100/40 dark:hover:bg-slate-800/30 transition-all flex items-center justify-center gap-1.5 min-h-[40px]">
              <FileText className="w-3.5 h-3.5" />
              Statements
            </button>
          }
        />
        {account.type === AccountType.CREDIT_CARD ? (
          <CardsDialog
            account={account}
            trigger={
              <button
                type="button"
                suppressHydrationWarning
                className="flex-1 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-400 hover:bg-slate-100/40 dark:hover:bg-slate-800/30 transition-all flex items-center justify-center gap-1.5 min-h-[40px]">
                <CardIcon className="w-3.5 h-3.5" />
                Cards
              </button>
            }
          />
        ) : null}
      </div>
    </div>
  );
};

export default async function AccountsPage() {
  const accounts = await accountsApi.list();

  const bankAccounts = accounts.filter(isAccountOfType(AccountType.BANK_ACCOUNT));
  const creditCards = accounts.filter(isAccountOfType(AccountType.CREDIT_CARD));
  const brokerAccounts = accounts.filter(isAccountOfType(AccountType.BROKER));
  const genericAccounts = accounts.filter(isAccountOfType(AccountType.GENERIC));

  const totalCreditLimit = creditCards.reduce(
    (sum, a) => sum + (a.creditLimit || 0),
    0,
  );

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
              className="shrink-0">
              <Plus className="w-4 h-4" />
              Add Account
            </Button>
          }
        />
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
                <Button>
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
                  className="text-2xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                  {bankAccounts.length}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4">
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
                          <div className="text-xs text-slate-400 dark:text-slate-500 line-clamp-1">
                            {account.description}
                          </div>
                        ) : null}
                      </div>

                      {account.last4 ? (
                        <span
                          className="text-2xs tabular-nums bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded shrink-0">
                          •••• {account.last4}
                        </span>
                      ) : null}
                    </div>

                    {/* Metadata Badges */}
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <Badge variant={account.financialPosition === 'liability' ? 'warning' : 'success'}
                             className="text-2xs py-0 px-2 font-semibold uppercase">
                        {getPositionLabel(account.financialPosition)}
                      </Badge>
                      {account.excludeFromNetAsset ? (
                        <Badge variant="destructive" className="text-2xs py-0 px-2 font-semibold uppercase">
                          Excluded
                        </Badge>
                      ) : null}
                      {account.ingestFromDate ? (
                        <Badge variant="info"
                               className="text-2xs py-0 px-2 font-semibold uppercase flex items-center gap-1">
                          <RefreshCw className="w-2.5 h-2.5 animate-spin-slow" />
                          Sync Active
                        </Badge>
                      ) : null}
                    </div>

                    <div
                      className="pt-2 flex flex-col gap-1 border-t border-dashed border-slate-100 dark:border-slate-800/40">
                      <div className="flex justify-between items-baseline">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">Balance</span>
                          {account.balanceAnchored && account.anchorDate ? (
                            <span className="text-2xs font-semibold bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded">
                              Anchored as of {formatDate(account.anchorDate)}
                            </span>
                          ) : null}
                          {account.reconciliationGap !== null && account.reconciliationGap !== undefined ? (
                            <span
                              title={`Calculated from opening balance: ${formatMoney(account.openingBalance ?? 0)}. Gap from anchored statement: ${formatMoney(account.reconciliationGap)}. Check statement history.`}
                              className="text-2xs font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded cursor-help flex items-center gap-1">
                              ⚠️ Gap: {formatMoney(account.reconciliationGap)}
                            </span>
                          ) : null}
                        </div>
                        <span className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight tabular-nums">
                          {formatMoney(account.balance ?? account.openingBalance)}
                        </span>
                      </div>
                    </div>

                    {account.ingestFromDate ? (
                      <div className="text-2xs text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-1">
                        <Calendar className="w-3 h-3 text-slate-400 dark:text-slate-600" />
                        <span>Gmail Sync Watermark: {formatDate(account.ingestFromDate)}</span>
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
          <div className="space-y-2">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800/60">
              <div className="flex items-center gap-2">
                <CardIcon className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">Credit Cards</h2>
                <span
                  className="text-2xs font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                  {creditCards.length}
                </span>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold tabular-nums">
                Total Limit: {formatMoney(totalCreditLimit)}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4">
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
                          <div className="text-xs text-slate-400 dark:text-slate-500 line-clamp-1">
                            {account.description}
                          </div>
                        ) : null}
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        {account.cards && account.cards.length > 1 ? (
                          <span className="text-2xs font-semibold bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400 px-1.5 py-0.5 rounded">
                            {account.cards.length} cards
                          </span>
                        ) : null}
                        <span
                          className="text-2xs tabular-nums bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 px-1.5 py-0.5 rounded">
                          •••• {account.last4}
                        </span>
                      </div>
                    </div>

                    {/* Metadata Badges */}
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <Badge variant={account.financialPosition === 'asset' ? 'success' : 'warning'}
                             className="text-2xs py-0 px-2 font-semibold uppercase">
                        {getPositionLabel(account.financialPosition)}
                      </Badge>
                      {account.excludeFromNetAsset ? (
                        <Badge variant="destructive" className="text-2xs py-0 px-2 font-semibold uppercase">
                          Excluded
                        </Badge>
                      ) : null}
                      {account.ingestFromDate ? (
                        <Badge variant="info"
                               className="text-2xs py-0 px-2 font-semibold uppercase flex items-center gap-1">
                          <RefreshCw className="w-2.5 h-2.5 animate-spin-slow" />
                          Sync Active
                        </Badge>
                      ) : null}
                    </div>

                    {/* Stats & Credit Limits */}
                    <div className="pt-2 space-y-2 border-t border-dashed border-slate-100 dark:border-slate-800/40">
                      <div className="flex justify-between items-baseline">
                        <div className="flex items-center gap-1.5">
                          <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">Balance</span>
                          {account.balanceAnchored && account.anchorDate ? (
                            <span className="text-2xs font-semibold bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 px-1.5 py-0.5 rounded">
                              Anchored as of {formatDate(account.anchorDate)}
                            </span>
                          ) : null}
                        </div>
                        <span className="text-lg font-bold text-slate-900 dark:text-white tracking-tight tabular-nums">
                          {formatNullableMoney(account.balance)}
                        </span>
                      </div>

                      <div className="flex justify-between items-baseline">
                        <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">Credit Limit</span>
                        <span className="text-sm font-bold text-slate-900 dark:text-white tracking-tight tabular-nums">
                          {formatMoney(account.creditLimit)}
                        </span>
                      </div>

                      {(() => {
                        if (
                          account.creditLimit !== null &&
                          account.creditLimit !== undefined &&
                          account.creditLimit > 0 &&
                          account.balance !== null &&
                          account.balance !== undefined
                        ) {
                          const owed = account.balance < 0 ? -account.balance : 0;
                          const utilizationPct = Math.min(100, Math.max(0, Math.round((owed / account.creditLimit) * 100)));
                          let barColor = 'bg-emerald-500 dark:bg-emerald-400';
                          let labelColor = 'text-emerald-600 dark:text-emerald-400';
                          if (utilizationPct >= 30 && utilizationPct < 70) {
                            barColor = 'bg-amber-500 dark:bg-amber-400';
                            labelColor = 'text-amber-600 dark:text-amber-400';
                          } else if (utilizationPct >= 70) {
                            barColor = 'bg-rose-500 dark:bg-rose-400';
                            labelColor = 'text-rose-600 dark:text-rose-400';
                          }
                          return (
                            <div className="space-y-1 pt-1">
                              <div className="flex justify-between text-2xs font-medium">
                                <span className="text-slate-400 dark:text-slate-500">Utilization</span>
                                <span className={cn('tabular-nums font-bold', labelColor)}>
                                  {utilizationPct}%
                                </span>
                              </div>
                              <div className="w-full h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                                <div
                                  className={cn('h-full rounded-full transition-all duration-300', barColor)}
                                  style={{ width: `${utilizationPct}%` }}
                                />
                              </div>
                            </div>
                          );
                        }
                        return null;
                      })()}
                    </div>

                    <div
                      className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-50 dark:border-slate-800/30 text-2xs text-slate-500 dark:text-slate-400">
                      <div className="flex flex-col">
                        <span className="text-2xs text-slate-400">Due Date</span>
                        <span
                          className="font-semibold text-slate-700 dark:text-slate-300">{getOrdinalDay(account.paymentDueDay)} of every month</span>
                      </div>
                      <div className="flex flex-col text-right">
                        <span className="text-2xs text-slate-400">Grace Period</span>
                        <span
                          className="font-semibold text-slate-700 dark:text-slate-300">{account.gracePeriodDays} Days</span>
                      </div>
                    </div>

                    {account.ingestFromDate ? (
                      <div className="text-2xs text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-1">
                        <Calendar className="w-3 h-3 text-slate-400 dark:text-slate-600" />
                        <span>Gmail Sync Watermark: {formatDate(account.ingestFromDate)}</span>
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

          {/* Broker Accounts Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800/60">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">Broker Accounts</h2>
                <span
                  className="text-2xs font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                  {brokerAccounts.length}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4">
              {brokerAccounts.map((account) => (
                <AccountWrapper account={account} key={account.id}>
                  <div className="space-y-1">
                    <div className="flex justify-between items-start gap-2">
                      <div className="space-y-0.5">
                        <div
                          className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                          {account.name}
                        </div>
                        <div className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                          {account.provider || 'Broker'} {account.clientId ? `• ${account.clientId}` : ''}
                        </div>
                        {account.description ? (
                          <div className="text-xs text-slate-400 dark:text-slate-500 line-clamp-1">
                            {account.description}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-1.5 items-center">
                      <Badge variant={account.financialPosition === 'liability' ? 'warning' : 'success'}
                             className="text-2xs py-0 px-2 font-semibold uppercase">
                        {getPositionLabel(account.financialPosition)}
                      </Badge>
                      {account.excludeFromNetAsset ? (
                        <Badge variant="destructive" className="text-2xs py-0 px-2 font-semibold uppercase">
                          Excluded
                        </Badge>
                      ) : null}
                    </div>

                    <div
                      className="pt-2 space-y-1 border-t border-dashed border-slate-100 dark:border-slate-800/40">
                      <div className="flex justify-between items-baseline">
                        <span className="text-xs text-slate-400 dark:text-slate-500 font-medium">Portfolio Value</span>
                        <span className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight tabular-nums">
                          {formatMoney(account.balance ?? 0)}
                        </span>
                      </div>
                      {account.cashBalance !== undefined && (
                        <div className="flex justify-between items-baseline text-xs text-slate-500 dark:text-slate-400">
                          <span>Cash Balance</span>
                          <span className="tabular-nums font-semibold">{formatMoney(account.cashBalance)}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </AccountWrapper>
              ))}
              {brokerAccounts.length === 0 && (
                <div className="text-center py-6 text-xs text-slate-400 border border-dashed rounded-xl">
                  No broker accounts added.
                </div>
              )}
            </div>
          </div>

          {/* Generic / Other Accounts Section */}
          <div className="space-y-2">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800/60">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">Other Accounts</h2>
                <span
                  className="text-2xs font-bold px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
                  {genericAccounts.length}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-4">
              {genericAccounts.map((account) => (
                <AccountWrapper account={account} key={account.id}>
                  <div className="space-y-1">
                    <div className="flex justify-between items-start gap-2">
                      <div className="space-y-0.5">
                        <div
                          className="font-bold text-sm text-slate-900 dark:text-white group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                          {account.name}
                        </div>
                        {account.description ? (
                          <div className="text-xs text-slate-400 dark:text-slate-500 line-clamp-1">
                            {account.description}
                          </div>
                        ) : null}
                      </div>
                    </div>

                    {/* Metadata Badges */}
                    <div className="flex flex-wrap gap-1.5 items-center">
                      <Badge variant={account.financialPosition === 'liability' ? 'warning' : 'success'}
                             className="text-2xs py-0 px-2 font-semibold uppercase">
                        {getPositionLabel(account.financialPosition)}
                      </Badge>
                      {account.excludeFromNetAsset ? (
                        <Badge variant="destructive" className="text-2xs py-0 px-2 font-semibold uppercase">
                          Excluded
                        </Badge>
                      ) : null}
                      {account.ingestFromDate ? (
                        <Badge variant="info"
                               className="text-2xs py-0 px-2 font-semibold uppercase flex items-center gap-1">
                          <RefreshCw className="w-2.5 h-2.5 animate-spin-slow" />
                          Sync Active
                        </Badge>
                      ) : null}
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

                    {account.ingestFromDate ? (
                      <div className="text-2xs text-slate-400 dark:text-slate-500 flex items-center gap-1 mt-1">
                        <Calendar className="w-3 h-3 text-slate-400 dark:text-slate-600" />
                        <span>Gmail Sync Watermark: {formatDate(account.ingestFromDate)}</span>
                      </div>
                    ) : null}
                  </div>
                </AccountWrapper>
              ))}
              {genericAccounts.length === 0 && (
                <div className="text-center py-6 text-xs text-slate-400 border border-dashed rounded-xl">
                  No other accounts added.
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

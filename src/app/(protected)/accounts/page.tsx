import {
  CreditCard as CardIcon,
  Landmark,
  Plus,
  TrendingUp,
  Wallet,
} from 'lucide-react';

import { AccountFormWrapper } from '@/components/accounts/AccountFormWrapper';
import { buttonVariants } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { isAccountClosed, isAccountOfType } from '@/lib/account.types';
import { accountsApi } from '@/lib/apiClient';
import { AccountType } from '@/lib/types';
import { cn, formatMoney } from '@/lib/utils';

import { BankAccountTile } from './components/BankAccountTile';
import { BrokerTile } from './components/BrokerTile';
import { ClosedAccountsSection } from './components/ClosedAccountsSection';
import { CreditCardTile } from './components/CreditCardTile';
import { GenericAccountTile } from './components/GenericAccountTile';

export default async function AccountsPage() {
  const accounts = await accountsApi.list();

  // Open accounts render in each section's grid; closed ones live in a per-section
  // collapsible underneath — always reachable, never a URL state.
  const open = accounts.filter((a) => !isAccountClosed(a));
  const closed = accounts.filter((a) => isAccountClosed(a));

  const bankAccounts = open.filter(isAccountOfType(AccountType.BANK_ACCOUNT));
  const creditCards = open.filter(isAccountOfType(AccountType.CREDIT_CARD));
  const brokerAccounts = open.filter(isAccountOfType(AccountType.BROKER));
  const genericAccounts = open.filter(isAccountOfType(AccountType.GENERIC));

  const closedBankAccounts = closed.filter(isAccountOfType(AccountType.BANK_ACCOUNT));
  const closedCreditCards = closed.filter(isAccountOfType(AccountType.CREDIT_CARD));
  const closedBrokerAccounts = closed.filter(isAccountOfType(AccountType.BROKER));
  const closedGenericAccounts = closed.filter(isAccountOfType(AccountType.GENERIC));

  // Open cards only — a closed card contributes no available limit.
  const totalCreditLimit = creditCards.reduce(
    (sum, a) => sum + (a.creditLimit || 0),
    0
  );

  return (
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

      {accounts.length === 0 ? (
        <Card className="border-dashed border-slate-200 dark:border-slate-800 max-w-md mx-auto">
          <div className="text-center py-12 px-6 space-y-2">
            <div className="w-12 h-12 rounded-full bg-slate-50 dark:bg-slate-950 flex items-center justify-center mx-auto text-slate-400">
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
            <AccountFormWrapper triggerClassName={buttonVariants()}>
              Get Started
            </AccountFormWrapper>
          </div>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
          {/* Bank Accounts Section */}
          <div className="space-y-1">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800/60">
              <div className="flex items-center gap-2">
                <Landmark className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">Bank Accounts</h2>
                <span className="text-2xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400">
                  {bankAccounts.length}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-2">
              {bankAccounts.map((account) => (
                <BankAccountTile key={account.id} account={account} />
              ))}
              {bankAccounts.length === 0 && closedBankAccounts.length === 0 && (
                <div className="text-center py-6 text-xs text-slate-400 border border-dashed rounded-xl">
                  No bank accounts added.
                </div>
              )}
            </div>
            <ClosedAccountsSection
              items={closedBankAccounts}
              renderItem={(account) => <BankAccountTile key={account.id} account={account} />}
            />
          </div>

          {/* Credit Cards Section */}
          <div className="space-y-1">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800/60">
              <div className="flex items-center gap-2">
                <CardIcon className="w-4 h-4 text-amber-600 dark:text-amber-400" />
                <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">Credit Cards</h2>
                <span className="text-2xs font-bold px-2 py-0.5 rounded-full bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400">
                  {creditCards.length}
                </span>
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold tabular-nums">
                Total Limit: {formatMoney(totalCreditLimit)}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-2">
              {creditCards.map((account) => (
                <CreditCardTile key={account.id} account={account} />
              ))}
              {creditCards.length === 0 && closedCreditCards.length === 0 && (
                <div className="text-center py-6 text-xs text-slate-400 border border-dashed rounded-xl">
                  No credit cards added.
                </div>
              )}
            </div>
            <ClosedAccountsSection
              items={closedCreditCards}
              renderItem={(account) => <CreditCardTile key={account.id} account={account} />}
            />
          </div>

          {/* Broker Accounts Section */}
          <div className="space-y-1">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800/60">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-blue-600 dark:text-blue-400" />
                <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">Brokers</h2>
                <span className="text-2xs font-bold px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400">
                  {brokerAccounts.length}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-2">
              {brokerAccounts.map((account) => (
                <BrokerTile key={account.id} account={account} />
              ))}
              {brokerAccounts.length === 0 && closedBrokerAccounts.length === 0 && (
                <div className="text-center py-6 text-xs text-slate-400 border border-dashed rounded-xl">
                  No broker accounts added.
                </div>
              )}
            </div>
            <ClosedAccountsSection
              items={closedBrokerAccounts}
              renderItem={(account) => <BrokerTile key={account.id} account={account} />}
            />
          </div>

          {/* Generic / Other Accounts Section */}
          <div className="space-y-1">
            <div className="flex items-center justify-between pb-1 border-b border-slate-100 dark:border-slate-800/60">
              <div className="flex items-center gap-2">
                <Wallet className="w-4 h-4 text-purple-600 dark:text-purple-400" />
                <h2 className="text-sm font-bold text-slate-800 dark:text-slate-200">Other Accounts</h2>
                <span className="text-2xs font-bold px-2 py-0.5 rounded-full bg-purple-50 dark:bg-purple-950/40 text-purple-600 dark:text-purple-400">
                  {genericAccounts.length}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-1 gap-2">
              {genericAccounts.map((account) => (
                <GenericAccountTile key={account.id} account={account} />
              ))}
              {genericAccounts.length === 0 && closedGenericAccounts.length === 0 && (
                <div className="text-center py-6 text-xs text-slate-400 border border-dashed rounded-xl">
                  No other accounts added.
                </div>
              )}
            </div>
            <ClosedAccountsSection
              items={closedGenericAccounts}
              renderItem={(account) => <GenericAccountTile key={account.id} account={account} />}
            />
          </div>
        </div>
      )}
    </div>
  );
}

'use client';

import { CreditCard, Eye, EyeOff, Landmark, TrendingUp, Wallet } from 'lucide-react';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Account } from '@/lib/account.types';
import { AccountType } from '@/lib/types';

interface AccountDetailsSectionProps {
  account?: Account;
  accountType: AccountType;
  showPassword: boolean;
  setShowPassword: React.Dispatch<React.SetStateAction<boolean>>;
}

export function AccountDetailsSection({
  account,
  accountType,
  showPassword,
  setShowPassword,
}: AccountDetailsSectionProps) {
  const bankAccount = account?.type === AccountType.BANK_ACCOUNT ? account : undefined;
  const creditCard = account?.type === AccountType.CREDIT_CARD ? account : undefined;
  const brokerAccount = account?.type === AccountType.BROKER ? account : undefined;

  if (accountType === AccountType.GENERIC) {
    return (
      <div className="bg-white dark:bg-slate-900/60 rounded-xl p-4 border border-slate-100 dark:border-slate-800/80 shadow-sm space-y-2">
        <div className="flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800/40 pb-2">
          <Wallet className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
          <h3 className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">
            Account Information
          </h3>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          Generic accounts track cash, petty cash, manual wallets, or custom assets/liabilities.
        </p>
      </div>
    );
  }

  if (accountType === AccountType.BROKER) {
    return (
      <div className="bg-white dark:bg-slate-900/60 rounded-xl p-4 border border-slate-100 dark:border-slate-800/80 shadow-sm space-y-2">
        <div className="flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800/40 pb-2">
          <TrendingUp className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
          <h3 className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">
            Broker Details
          </h3>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="provider" className="text-xs text-slate-600 dark:text-slate-350 font-semibold">
            Broker Provider
          </Label>
          <Input
            id="provider"
            name="provider"
            list="broker-providers"
            placeholder="Select or type provider (e.g. Zerodha, Groww)"
            defaultValue={brokerAccount?.provider}
            required
            className="bg-slate-50/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 rounded-lg text-xs"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="clientId" className="text-xs text-slate-600 dark:text-slate-350 font-semibold">
              Client ID (Optional)
            </Label>
            <Input
              id="clientId"
              name="clientId"
              placeholder="e.g. AB1234"
              defaultValue={brokerAccount?.clientId}
              className="bg-slate-50/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 rounded-lg text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="cashBalance" className="text-xs text-slate-600 dark:text-slate-350 font-semibold">
              Uninvested Cash Balance
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
              <Input
                id="cashBalance"
                name="cashBalance"
                type="number"
                step="0.01"
                placeholder="0.00"
                defaultValue={brokerAccount?.cashBalance ?? 0}
                className="pl-6 bg-slate-50/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 rounded-lg text-xs"
              />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900/60 rounded-xl p-4 border border-slate-100 dark:border-slate-800/80 shadow-sm space-y-2">
      <div className="flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800/40 pb-2">
        {accountType === AccountType.BANK_ACCOUNT ? (
          <Landmark className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
        ) : (
          <CreditCard className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
        )}
        <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
          {accountType === AccountType.BANK_ACCOUNT ? 'Bank Details' : 'Card Details'}
        </h3>
      </div>

      {accountType === AccountType.BANK_ACCOUNT ? (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="openingBalance" className="text-xs text-slate-600 dark:text-slate-350 font-semibold">
                Opening Balance
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                <Input
                  id="openingBalance"
                  name="openingBalance"
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  defaultValue={bankAccount?.openingBalance}
                  className="pl-6 bg-slate-50/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 rounded-lg text-xs"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="last4" className="text-xs text-slate-600 dark:text-slate-350 font-semibold">
                Last 4 Digits
              </Label>
              <Input
                id="last4"
                name="last4"
                type="text"
                pattern="[0-9]{4}"
                maxLength={4}
                placeholder="1234"
                defaultValue={bankAccount?.last4}
                className="bg-slate-50/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="statementPassword" className="text-xs text-slate-600 dark:text-slate-350 font-semibold">
              Statement Password (Optional)
            </Label>
            <div className="relative">
              <Input
                id="statementPassword"
                name="statementPassword"
                autoComplete="off"
                type="text"
                style={{ WebkitTextSecurity: showPassword ? 'none' : 'disk' } as React.CSSProperties}
                placeholder="Enter password if PDF statement is protected"
                className="pr-10 bg-slate-50/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 rounded-lg text-xs [&::placeholder]:[text-security:none]"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="last4" className="text-xs text-slate-600 dark:text-slate-350 font-semibold">
                Last 4 Digits
              </Label>
              <Input
                id="last4"
                name="last4"
                type="text"
                pattern="[0-9]{4}"
                maxLength={4}
                placeholder="1234"
                defaultValue={creditCard?.last4}
                required
                className="bg-slate-50/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 rounded-lg text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="creditLimit" className="text-xs text-slate-600 dark:text-slate-350 font-semibold">
                Credit Limit
              </Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">₹</span>
                <Input
                  id="creditLimit"
                  name="creditLimit"
                  type="number"
                  step="0.01"
                  placeholder="50,000"
                  defaultValue={creditCard?.creditLimit}
                  required
                  className="pl-6 bg-slate-50/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 rounded-lg text-xs"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="paymentDueDay" className="text-xs text-slate-600 dark:text-slate-350 font-semibold">
                Payment Due Day
              </Label>
              <Input
                id="paymentDueDay"
                name="paymentDueDay"
                type="number"
                min={1}
                max={31}
                placeholder="15"
                defaultValue={creditCard?.paymentDueDay}
                required
                className="bg-slate-50/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 rounded-lg text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="gracePeriodDays" className="text-xs text-slate-600 dark:text-slate-350 font-semibold">
                Grace Period (Days)
              </Label>
              <Input
                id="gracePeriodDays"
                name="gracePeriodDays"
                type="number"
                min={0}
                placeholder="20"
                defaultValue={creditCard?.gracePeriodDays}
                required
                className="bg-slate-50/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 rounded-lg text-xs"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="anniversaryDate" className="text-xs text-slate-600 dark:text-slate-350 font-semibold">
              Card Anniversary Date
            </Label>
            <Input
              id="anniversaryDate"
              name="anniversaryDate"
              type="date"
              defaultValue={creditCard?.anniversaryDate ?? ''}
              required
              className="bg-slate-50/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 rounded-lg text-xs"
            />
            <p className="text-2xs text-slate-400 dark:text-slate-500">
              Membership anniversary — anchors “per anniversary year” reward windows and the Rewards overview.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="statementPassword" className="text-xs text-slate-600 dark:text-slate-350 font-semibold">
              Statement Password (Optional)
            </Label>
            <div className="relative">
              <Input
                id="statementPassword"
                name="statementPassword"
                autoComplete="off"
                type="text"
                style={{ WebkitTextSecurity: showPassword ? 'none' : 'disk' } as React.CSSProperties}
                placeholder="Enter password if PDF statement is protected"
                className="pr-10 bg-slate-50/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 rounded-lg text-xs [&::placeholder]:[text-security:none]"
              />
              <button
                type="button"
                onClick={() => setShowPassword((prev) => !prev)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none"
              >
                {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

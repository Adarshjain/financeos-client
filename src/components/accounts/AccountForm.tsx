'use client';

import { Calendar, CreditCard, Eye, EyeOff, FileText, Landmark, Shield, TrendingUp, Wallet } from 'lucide-react';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { createAccount, updateAccount } from '@/actions/accounts';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Account, AccountRequest } from '@/lib/account.types';
import { optionalDecimal, optionalInteger, optionalString } from '@/lib/forms';
import { AccountType, FinancialPosition } from '@/lib/types';
import { cn, getAccountTypeLabel } from '@/lib/utils';

const financialPositions = [
  { value: 'asset', label: 'Asset' },
  { value: 'liability', label: 'Liability' },
];

const COMMON_BROKERS = [
  'Zerodha',
  'Groww',
  'SBI MF',
  'Upstox',
  'Angel One',
  'ICICI Direct',
  'HDFC Securities',
  'Kuvera',
  'Coin',
  'Paytm Money',
];

const ACCOUNT_TYPE_CONFIG: Record<
  AccountType,
  {
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    activeClassName: string;
  }
> = {
  [AccountType.BANK_ACCOUNT]: {
    label: 'Bank',
    icon: Landmark,
    activeClassName:
      'bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-500 text-emerald-700 dark:text-emerald-400 font-semibold',
  },
  [AccountType.CREDIT_CARD]: {
    label: 'Credit Card',
    icon: CreditCard,
    activeClassName:
      'bg-amber-50/60 dark:bg-amber-950/20 border-amber-500 text-amber-700 dark:text-amber-400 font-semibold',
  },
  [AccountType.BROKER]: {
    label: 'Broker',
    icon: TrendingUp,
    activeClassName:
      'bg-blue-50/60 dark:bg-blue-950/20 border-blue-500 text-blue-700 dark:text-blue-400 font-semibold',
  },
  [AccountType.GENERIC]: {
    label: 'Wallet/Cash',
    icon: Wallet,
    activeClassName:
      'bg-purple-50/60 dark:bg-purple-950/20 border-purple-500 text-purple-700 dark:text-purple-400 font-semibold',
  },
};

interface AccountTypeButtonProps {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  selected: boolean;
  disabled?: boolean;
  activeClassName: string;
  onClick?: () => void;
}

function AccountTypeButton({
  label,
  icon: Icon,
  selected,
  disabled,
  activeClassName,
  onClick,
}: AccountTypeButtonProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "flex items-center justify-center gap-2 py-2 px-2 rounded-xl border-2 text-center transition-all shadow-sm",
        selected
          ? activeClassName
          : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850",
        disabled && "opacity-60 cursor-not-allowed border-dashed"
      )}
    >
      <Icon className="w-4 h-4" />
      <span className="text-xs">{label}</span>
    </button>
  );
}

interface AccountFormProps {
  account?: Account;
  onSuccess?: () => void;
  onClose?: () => void;
}

export function AccountForm({ account, onSuccess, onClose }: AccountFormProps) {
  const isUpdateMode = !!account;
  const [accountType, setAccountType] = useState<AccountType>(
    account?.type || AccountType.BANK_ACCOUNT,
  );
  const [excludeFromNetAsset, setExcludeFromNetAsset] = useState<boolean>(
    account?.excludeFromNetAsset || false,
  );
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (account?.type) {
      setAccountType(account.type);
    }
    if (account) {
      setExcludeFromNetAsset(account.excludeFromNetAsset || false);
    }
  }, [account]);

  const bankAccount = account?.type === AccountType.BANK_ACCOUNT ? account : undefined;
  const creditCard = account?.type === AccountType.CREDIT_CARD ? account : undefined;
  const brokerAccount = account?.type === AccountType.BROKER ? account : undefined;

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const form = e.currentTarget;
    const formData = new FormData(form);

    const name = formData.get('name') as string;
    const financialPosition = (formData.get('financialPosition') as FinancialPosition) || 'asset';
    const description = formData.get('description') as string | undefined;
    const ingestFromDateVal = formData.get('ingestFromDate') as string | null;
    const ingestFromDate = ingestFromDateVal ? ingestFromDateVal : null;

    let data: AccountRequest | undefined;
    const statementPasswordVal = formData.get('statementPassword') as string;

    if (accountType === AccountType.BANK_ACCOUNT) {
      data = {
        name,
        excludeFromNetAsset,
        financialPosition,
        description,
        ingestFromDate,
        type: AccountType.BANK_ACCOUNT,
        last4: (formData.get('last4') as string) ?? undefined,
        openingBalance: optionalDecimal(formData, 'openingBalance'),
        ...(statementPasswordVal ? { statementPassword: statementPasswordVal } : {}),
      };
    }

    if (accountType === AccountType.CREDIT_CARD) {
      const last4 = optionalString(formData, 'last4');
      const creditLimit = optionalDecimal(formData, 'creditLimit');
      const paymentDueDay = optionalInteger(formData, 'paymentDueDay');
      const gracePeriodDays = optionalInteger(formData, 'gracePeriodDays');
      const anniversaryDate = optionalString(formData, 'anniversaryDate');

      if (
        last4 === undefined ||
        creditLimit === undefined ||
        paymentDueDay === undefined ||
        gracePeriodDays === undefined ||
        anniversaryDate === undefined
      ) {
        const missing = [
          last4 === undefined ? 'last 4 digits' : null,
          creditLimit === undefined ? 'credit limit' : null,
          paymentDueDay === undefined ? 'payment due day' : null,
          gracePeriodDays === undefined ? 'grace period' : null,
          anniversaryDate === undefined ? 'anniversary date' : null,
        ].filter((field): field is string => field !== null);
        toast.error(`Credit card needs ${missing.join(', ')}.`);
        setIsSubmitting(false);
        return;
      }
      if (paymentDueDay < 1 || paymentDueDay > 31) {
        toast.error('Payment due day must be between 1 and 31.');
        setIsSubmitting(false);
        return;
      }
      if (gracePeriodDays < 0) {
        toast.error('Grace period cannot be negative.');
        setIsSubmitting(false);
        return;
      }

      data = {
        name,
        excludeFromNetAsset,
        financialPosition,
        description,
        ingestFromDate,
        type: AccountType.CREDIT_CARD,
        last4,
        creditLimit,
        paymentDueDay,
        gracePeriodDays,
        anniversaryDate,
        ...(statementPasswordVal ? { statementPassword: statementPasswordVal } : {}),
      };
    }

    if (accountType === AccountType.BROKER) {
      const provider = optionalString(formData, 'provider');
      if (!provider) {
        toast.error('Broker provider is required.');
        setIsSubmitting(false);
        return;
      }
      const clientId = optionalString(formData, 'clientId');
      const cashBalance = optionalDecimal(formData, 'cashBalance') ?? 0;

      data = {
        name,
        excludeFromNetAsset,
        financialPosition,
        description,
        ingestFromDate,
        type: AccountType.BROKER,
        provider,
        clientId,
        cashBalance,
      };
    }

    if (accountType === AccountType.GENERIC) {
      data = {
        name,
        excludeFromNetAsset,
        financialPosition,
        description,
        ingestFromDate,
        type: AccountType.GENERIC,
      };
    }

    if (!data) {
      toast.error(
        `Editing ${getAccountTypeLabel(accountType)} accounts isn't supported yet.`,
      );
      setIsSubmitting(false);
      return;
    }

    try {
      const res = isUpdateMode && account
        ? await updateAccount(account.id, data)
        : await createAccount(data);
      if (res.success) {
        toast.success(isUpdateMode ? 'Account updated successfully!' : 'Account created successfully!');
        onSuccess?.();
      } else {
        toast.error(res.error.message);
      }
    } catch (err) {
      toast.error('An error occurred: ' + (err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      autoComplete="off"
      className="flex flex-col h-full max-h-screen sm:max-h-[85vh] bg-slate-50/40 dark:bg-slate-950/20 overflow-hidden"
    >
      <datalist id="broker-providers">
        {COMMON_BROKERS.map((b) => (
          <option key={b} value={b} />
        ))}
      </datalist>

      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800/60 bg-white dark:bg-slate-950">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          {accountType === AccountType.BANK_ACCOUNT ? (
            <Landmark className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          ) : accountType === AccountType.CREDIT_CARD ? (
            <CreditCard className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          ) : accountType === AccountType.BROKER ? (
            <TrendingUp className="w-5 h-5 text-blue-600 dark:text-blue-400" />
          ) : (
            <Wallet className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          )}
          {isUpdateMode ? 'Edit Account' : 'Create Account'}
        </h2>
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
        {/* Account Type Selection (Only for Create Mode) */}
        <div className="space-y-2">
          <Label className="text-xs text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1">
            <Shield className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            Account Type
          </Label>
          <div className={`grid gap-2 ${isUpdateMode ? 'grid-cols-1' : 'grid-cols-2 sm:grid-cols-4'}`}>
            {isUpdateMode ? (
              <AccountTypeButton
                label={ACCOUNT_TYPE_CONFIG[accountType]?.label ?? 'Account'}
                icon={ACCOUNT_TYPE_CONFIG[accountType]?.icon ?? Landmark}
                selected={true}
                disabled
                activeClassName={ACCOUNT_TYPE_CONFIG[accountType]?.activeClassName ?? 'bg-slate-50 border-slate-500 text-slate-700 font-semibold'}
              />
            ) : (
              <>
                <AccountTypeButton
                    label={ACCOUNT_TYPE_CONFIG.bank_account.label ?? 'Account'}
                  icon={Landmark}
                  selected={accountType === AccountType.BANK_ACCOUNT}
                  activeClassName={ACCOUNT_TYPE_CONFIG[AccountType.BANK_ACCOUNT].activeClassName}
                  onClick={() => setAccountType(AccountType.BANK_ACCOUNT)}
                />
                <AccountTypeButton
                    label={ACCOUNT_TYPE_CONFIG.credit_card.label ?? 'Account'}
                  icon={CreditCard}
                  selected={accountType === AccountType.CREDIT_CARD}
                  activeClassName={ACCOUNT_TYPE_CONFIG[AccountType.CREDIT_CARD].activeClassName}
                  onClick={() => setAccountType(AccountType.CREDIT_CARD)}
                />
                <AccountTypeButton
                    label={ACCOUNT_TYPE_CONFIG.broker.label ?? 'Account'}
                  icon={TrendingUp}
                  selected={accountType === AccountType.BROKER}
                  activeClassName={ACCOUNT_TYPE_CONFIG[AccountType.BROKER].activeClassName}
                  onClick={() => setAccountType(AccountType.BROKER)}
                />
                <AccountTypeButton
                    label={ACCOUNT_TYPE_CONFIG.generic.label ?? 'Account'}
                  icon={Wallet}
                  selected={accountType === AccountType.GENERIC}
                  activeClassName={ACCOUNT_TYPE_CONFIG[AccountType.GENERIC].activeClassName}
                  onClick={() => setAccountType(AccountType.GENERIC)}
                />
              </>
            )}
          </div>
        </div>

        {/* Card 1: General Info */}
        <div className="bg-white dark:bg-slate-900/60 rounded-xl p-4 border border-slate-100 dark:border-slate-800/80 shadow-sm space-y-2">
          <div className="flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800/40 pb-2">
            <FileText className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">General Information</h3>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs text-slate-600 dark:text-slate-350 font-semibold">Account Name</Label>
            <Input
              id="name"
              name="name"
              autoComplete="off"
              placeholder={accountType === AccountType.BROKER ? "e.g., Zerodha Demat" : "e.g., HDFC Savings"}
              defaultValue={account?.name}
              required
              className="bg-slate-50/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 rounded-lg text-xs"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="description" className="text-xs text-slate-600 dark:text-slate-350 font-semibold">Description (Optional)</Label>
            <Input
              id="description"
              name="description"
              placeholder="e.g., Primary Broking & Mutual Fund Account"
              defaultValue={account?.description}
              className="bg-slate-50/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 rounded-lg text-xs"
            />
          </div>
        </div>

        {/* Card 2: Account Details */}
        {accountType === AccountType.GENERIC ? (
          <div className="bg-white dark:bg-slate-900/60 rounded-xl p-4 border border-slate-100 dark:border-slate-800/80 shadow-sm space-y-2">
            <div className="flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800/40 pb-2">
              <Wallet className="w-3.5 h-3.5 text-purple-600 dark:text-purple-400" />
              <h3 className="text-xs font-bold text-purple-600 dark:text-purple-400 uppercase tracking-wider">Account Information</h3>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              Generic accounts track cash, petty cash, manual wallets, or custom assets/liabilities.
            </p>
          </div>
        ) : accountType === AccountType.BROKER ? (
          <div className="bg-white dark:bg-slate-900/60 rounded-xl p-4 border border-slate-100 dark:border-slate-800/80 shadow-sm space-y-2">
            <div className="flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800/40 pb-2">
              <TrendingUp className="w-3.5 h-3.5 text-blue-600 dark:text-blue-400" />
              <h3 className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">Broker Details</h3>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="provider" className="text-xs text-slate-600 dark:text-slate-350 font-semibold">Broker Provider</Label>
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
                <Label htmlFor="clientId" className="text-xs text-slate-600 dark:text-slate-350 font-semibold">Client ID (Optional)</Label>
                <Input
                  id="clientId"
                  name="clientId"
                  placeholder="e.g. AB1234"
                  defaultValue={brokerAccount?.clientId}
                  className="bg-slate-50/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 rounded-lg text-xs"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="cashBalance" className="text-xs text-slate-600 dark:text-slate-350 font-semibold">Uninvested Cash Balance</Label>
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
        ) : (
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
                    <Label htmlFor="openingBalance" className="text-xs text-slate-600 dark:text-slate-350 font-semibold">Opening Balance</Label>
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
                    <Label htmlFor="last4" className="text-xs text-slate-600 dark:text-slate-350 font-semibold">Last 4 Digits</Label>
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
                  <Label htmlFor="statementPassword" className="text-xs text-slate-600 dark:text-slate-350 font-semibold">Statement Password (Optional)</Label>
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
                      onClick={() => setShowPassword(prev => !prev)}
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
                    <Label htmlFor="last4" className="text-xs text-slate-600 dark:text-slate-350 font-semibold">Last 4 Digits</Label>
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
                    <Label htmlFor="creditLimit" className="text-xs text-slate-600 dark:text-slate-350 font-semibold">Credit Limit</Label>
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
                    <Label htmlFor="paymentDueDay" className="text-xs text-slate-600 dark:text-slate-350 font-semibold">Payment Due Day</Label>
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
                    <Label htmlFor="gracePeriodDays" className="text-xs text-slate-600 dark:text-slate-350 font-semibold">Grace Period (Days)</Label>
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
                  <Label htmlFor="anniversaryDate" className="text-xs text-slate-600 dark:text-slate-350 font-semibold">Card Anniversary Date</Label>
                  <Input
                    id="anniversaryDate"
                    name="anniversaryDate"
                    type="date"
                    defaultValue={creditCard?.anniversaryDate ?? ''}
                    required
                    className="bg-slate-50/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 rounded-lg text-xs"
                  />
                  <p className="text-[10px] text-slate-400 dark:text-slate-500">
                    Membership anniversary — anchors “per anniversary year” reward windows and the Rewards overview.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="statementPassword" className="text-xs text-slate-600 dark:text-slate-350 font-semibold">Statement Password (Optional)</Label>
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
                      onClick={() => setShowPassword(prev => !prev)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 focus:outline-none"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {/* Card 3: Configurations & Sync */}
        <div className="bg-white dark:bg-slate-900/60 rounded-xl p-4 border border-slate-100 dark:border-slate-800/80 shadow-sm space-y-2">
          <div className="flex items-center gap-1.5 border-b border-slate-100 dark:border-slate-800/40 pb-2">
            <TrendingUp className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Configurations & Sync</h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs text-slate-600 dark:text-slate-350 font-semibold">Financial Position</Label>
              <Select
                name="financialPosition"
                defaultValue={account?.financialPosition || 'asset'}
              >
                <SelectTrigger className="w-full bg-slate-50/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 rounded-lg text-xs font-semibold text-slate-700 dark:text-slate-200 shadow-none">
                  <SelectValue placeholder="Select position" />
                </SelectTrigger>
                <SelectContent className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
                  {financialPositions.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value} className="text-xs hover:bg-slate-50 dark:hover:bg-slate-900">
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ingestFromDate" className="text-xs text-slate-600 dark:text-slate-350 font-semibold flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                Ingest From Date
              </Label>
              <Input
                id="ingestFromDate"
                name="ingestFromDate"
                type="date"
                defaultValue={
                  account?.ingestFromDate
                    ? account.ingestFromDate.split('T')[0]
                    : undefined
                }
                className="bg-slate-50/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 rounded-lg text-xs h-9 [color-scheme:light] dark:[color-scheme:dark]"
              />
            </div>
          </div>

          <div className="h-[1px] w-full bg-slate-100 dark:bg-slate-800/40 my-1"></div>

          <div className="flex items-center justify-between py-1.5 px-0.5">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Exclude from Net Asset</span>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">Do not include in net asset calculation</span>
            </div>
            <input
              type="hidden"
              name="excludeFromNetAsset"
              value={excludeFromNetAsset ? 'true' : 'false'}
            />
            <button
              type="button"
              onClick={() => setExcludeFromNetAsset(prev => !prev)}
              className={cn(
                "relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none",
                excludeFromNetAsset ? "bg-red-500" : "bg-slate-200 dark:bg-slate-800"
              )}
            >
              <span
                className={cn(
                  "pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out",
                  excludeFromNetAsset ? "translate-x-4" : "translate-x-0"
                )}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Sticky/Blur Footer Action Buttons */}
      <div className="flex gap-3 p-4 border-t border-slate-100 dark:border-slate-800/60 bg-white/70 dark:bg-slate-950/70 backdrop-blur-md">
        <Button
          variant="outline"
          className="flex-1"
          type="button"
          onClick={onClose}
        >
          Cancel
        </Button>
        <Button
          className="flex-1"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? (isUpdateMode ? 'Saving...' : 'Creating...') : (isUpdateMode ? 'Save Changes' : 'Create Account')}
        </Button>
      </div>
    </form>
  );
}

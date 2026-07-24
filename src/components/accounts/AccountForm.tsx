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
import { AccountType, FinancialPosition } from '@/lib/types';
import { cn } from '@/lib/utils';

const financialPositions = [
  { value: 'asset', label: 'Asset' },
  { value: 'liability', label: 'Liability' },
];

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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const form = e.currentTarget;
    const formData = new FormData(form);

    const name = formData.get('name') as string;
    const financialPosition = formData.get('financialPosition') as FinancialPosition;
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
        last4: formData.get('last4') as string ?? undefined,
        openingBalance: parseInt(formData.get('openingBalance') as string) ?? undefined,
        ...(statementPasswordVal ? { statementPassword: statementPasswordVal } : {}),
      };
    }

    if (accountType === AccountType.CREDIT_CARD) {
      data = {
        name,
        excludeFromNetAsset,
        financialPosition,
        description,
        ingestFromDate,
        type: AccountType.CREDIT_CARD,
        last4: formData.get('last4') as string ?? undefined,
        creditLimit: parseInt(formData.get('creditLimit') as string) ?? undefined,
        paymentDueDay: parseInt(formData.get('paymentDueDay') as string) ?? undefined,
        gracePeriodDays: parseInt(formData.get('gracePeriodDays') as string) ?? undefined,
        ...(statementPasswordVal ? { statementPassword: statementPasswordVal } : {}),
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
      className="flex flex-col h-full max-h-screen sm:max-h-[85vh] bg-slate-50/40 dark:bg-slate-950/20 overflow-hidden"
    >
      {/* Header */}
      <div className="px-6 py-5 border-b border-slate-100 dark:border-slate-800/60 bg-white dark:bg-slate-950">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
          {accountType === AccountType.BANK_ACCOUNT ? (
            <Landmark className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
          ) : accountType === AccountType.CREDIT_CARD ? (
            <CreditCard className="w-5 h-5 text-amber-600 dark:text-amber-400" />
          ) : (
            <Wallet className="w-5 h-5 text-purple-600 dark:text-purple-400" />
          )}
          {isUpdateMode ? 'Edit Account' : 'Create Account'}
        </h2>
      </div>

      {/* Scrollable Body */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-5">
        {/* Account Type Selection (Only for Create Mode) */}
        <div className="space-y-2">
          <Label className="text-xs text-slate-500 dark:text-slate-400 font-semibold flex items-center gap-1">
            <Shield className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            Account Type
          </Label>
          <div className="flex gap-3">
            <button
              type="button"
              disabled={isUpdateMode}
              onClick={() => setAccountType(AccountType.BANK_ACCOUNT)}
              className={cn(
                "flex-1 flex flex-col items-center gap-2 py-3 px-3 rounded-xl border-2 text-center transition-all shadow-sm",
                accountType === AccountType.BANK_ACCOUNT
                  ? "bg-emerald-50/60 dark:bg-emerald-950/20 border-emerald-500 text-emerald-700 dark:text-emerald-400 font-semibold"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850",
                isUpdateMode && "opacity-60 cursor-not-allowed border-dashed"
              )}
            >
              <Landmark className="w-5 h-5" />
              <span className="text-xs">Bank Account</span>
            </button>
            <button
              type="button"
              disabled={isUpdateMode}
              onClick={() => setAccountType(AccountType.CREDIT_CARD)}
              className={cn(
                "flex-1 flex flex-col items-center gap-2 py-3 px-3 rounded-xl border-2 text-center transition-all shadow-sm",
                accountType === AccountType.CREDIT_CARD
                  ? "bg-amber-50/60 dark:bg-amber-950/20 border-amber-500 text-amber-700 dark:text-amber-400 font-semibold"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850",
                isUpdateMode && "opacity-60 cursor-not-allowed border-dashed"
              )}
            >
              <CreditCard className="w-5 h-5" />
              <span className="text-xs">Credit Card</span>
            </button>
            <button
              type="button"
              disabled={isUpdateMode}
              onClick={() => setAccountType(AccountType.GENERIC)}
              className={cn(
                "flex-1 flex flex-col items-center gap-2 py-3 px-3 rounded-xl border-2 text-center transition-all shadow-sm",
                accountType === AccountType.GENERIC
                  ? "bg-purple-50/60 dark:bg-purple-950/20 border-purple-500 text-purple-700 dark:text-purple-400 font-semibold"
                  : "bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-850",
                isUpdateMode && "opacity-60 cursor-not-allowed border-dashed"
              )}
            >
              <Wallet className="w-5 h-5" />
              <span className="text-xs">Wallet / Cash</span>
            </button>
          </div>
        </div>

        {/* Card 1: General Info */}
        <div className="bg-white dark:bg-slate-900/60 rounded-xl p-4 border border-slate-100 dark:border-slate-800/80 shadow-sm space-y-4">
          <div className="flex items-center gap-1.5 border-b border-slate-55 dark:border-slate-800/40 pb-2">
            <FileText className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            <h3 className="text-xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">General Information</h3>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="name" className="text-xs text-slate-600 dark:text-slate-350 font-semibold">Account Name</Label>
            <Input
              id="name"
              name="name"
              placeholder="e.g., HDFC Savings"
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
              placeholder="e.g., Primary Salary Account"
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
              Generic accounts track cash, petty cash, manual wallets, or custom assets/liabilities without requiring bank statement password rules or credit limit settings.
            </p>
          </div>
        ) : (
          <div className="bg-white dark:bg-slate-900/60 rounded-xl p-4 border border-slate-100 dark:border-slate-800/80 shadow-sm space-y-4">
            <div className="flex items-center gap-1.5 border-b border-slate-55 dark:border-slate-800/40 pb-2">
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
                        defaultValue={account && 'openingBalance' in account ? account.openingBalance : undefined}
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
                      defaultValue={account && 'last4' in account ? account.last4 : undefined}
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
                      type={showPassword ? 'text' : 'password'}
                      placeholder={account && 'statementPassword' in account && account.statementPassword ? '••••••••' : 'Enter password if PDF statement is protected'}
                      className="pr-10 bg-slate-50/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 rounded-lg text-xs"
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
                      defaultValue={account && 'last4' in account ? account.last4 : undefined}
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
                        defaultValue={account && 'creditLimit' in account ? account.creditLimit : undefined}
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
                      defaultValue={account && 'paymentDueDay' in account ? account.paymentDueDay : undefined}
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
                      defaultValue={account && 'gracePeriodDays' in account ? account.gracePeriodDays : undefined}
                      required
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
                      type={showPassword ? 'text' : 'password'}
                      placeholder={account && 'statementPassword' in account && account.statementPassword ? '••••••••' : 'Enter password if PDF statement is protected'}
                      className="pr-10 bg-slate-50/50 dark:bg-slate-950/50 border-slate-200 dark:border-slate-800 rounded-lg text-xs"
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
        <div className="bg-white dark:bg-slate-900/60 rounded-xl p-4 border border-slate-100 dark:border-slate-800/80 shadow-sm space-y-4">
          <div className="flex items-center gap-1.5 border-b border-slate-55 dark:border-slate-800/40 pb-2">
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
          <div className="text-[10px] text-slate-400 dark:text-slate-500 -mt-2 leading-normal">
            Gmail ingestion watermark date. Empty to ingest everything.
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
          className="flex-1 rounded-xl h-9 text-xs text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
          size="lg"
          type="button"
          onClick={onClose}
        >
          Cancel
        </Button>
        <Button
          className="flex-1 rounded-xl h-9 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm transition-all"
          size="lg"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? (isUpdateMode ? 'Saving...' : 'Creating...') : (isUpdateMode ? 'Save Changes' : 'Create Account')}
        </Button>
      </div>
    </form>
  );
}

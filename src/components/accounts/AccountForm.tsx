'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import { createAccount, updateAccount } from '@/actions/accounts';
import { SubmitButton } from '@/components/forms/SubmitButton';
import { FormField } from '@/components/ui/form-field';
import { NativeSelect } from '@/components/ui/native-select';
import { Account, AccountRequest } from '@/lib/account.types';
import { AccountType, FinancialPosition } from '@/lib/types';

const accountTypes: { value: AccountType; label: string }[] = [
  { value: AccountType.BANK_ACCOUNT, label: 'Bank Account' },
  { value: AccountType.CREDIT_CARD, label: 'Credit Card' },
  // { value: 'stock', label: 'Stock' },
  // { value: 'mutual_fund', label: 'Mutual Fund' },
  // { value: 'generic', label: 'Generic' },
];

const financialPositions = [
  { value: 'asset', label: 'Asset' },
  { value: 'liability', label: 'Liability' },
];

interface AccountFormProps {
  account?: Account;
  onSuccess?: () => void;
}

export function AccountForm({ account, onSuccess }: AccountFormProps) {
  const isUpdateMode = !!account;
  const [accountType, setAccountType] = useState<AccountType>(
    account?.type || AccountType.BANK_ACCOUNT,
  );
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (account?.type) {
      setAccountType(account.type);
    }
  }, [account]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    const form = e.currentTarget;
    const formData = new FormData(form);

    const name = formData.get('name') as string;
    const accountType = formData.get('type') as AccountType;
    const excludeFromNetAsset = formData.get('excludeFromNetAsset') === 'true';
    const financialPosition = formData.get('financialPosition') as FinancialPosition;
    const description = formData.get('description') as string | undefined;

    let data: AccountRequest | undefined;

    if (accountType === AccountType.BANK_ACCOUNT) {
      data = {
        name,
        excludeFromNetAsset,
        financialPosition,
        description,
        type: AccountType.BANK_ACCOUNT,
        last4: formData.get('last4') as string ?? undefined,
        openingBalance: parseInt(formData.get('openingBalance') as string) ?? undefined,
      };
    }

    if (accountType === AccountType.CREDIT_CARD) {
      data = {
        name,
        excludeFromNetAsset,
        financialPosition,
        description,
        type: AccountType.CREDIT_CARD,
        last4: formData.get('last4') as string ?? undefined,
        creditLimit: parseInt(formData.get('creditLimit') as string) ?? undefined,
        paymentDueDay: parseInt(formData.get('paymentDueDay') as string) ?? undefined,
        gracePeriodDays: parseInt(formData.get('gracePeriodDays') as string) ?? undefined,
        statementPassword: formData.get('statementPassword') as string ?? undefined,
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
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <FormField
        label="Account Name"
        name="name"
        placeholder="e.g., HDFC Savings"
        defaultValue={account?.name}
        required
      />
      <div className="flex gap-2">
        <NativeSelect
          label="Account Type"
          name="type"
          options={accountTypes}
          value={accountType}
          onChange={(e) => setAccountType(e.currentTarget.value as AccountType)}
          className={isUpdateMode ? 'pointer-events-none opacity-40' : undefined}
          required
        />

        <NativeSelect
          label="Financial Position"
          name="financialPosition"
          options={financialPositions}
          defaultValue={account?.financialPosition || 'asset'}
        />
      </div>
      <FormField
        label="Description (Optional)"
        name="description"
        placeholder="Description"
        defaultValue={account?.description}
      />

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="excludeFromNetAsset"
          name="excludeFromNetAsset"
          value="true"
          defaultChecked={account?.excludeFromNetAsset}
          className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
        />
        <label
          htmlFor="excludeFromNetAsset"
          className="text-sm text-slate-700 dark:text-slate-300"
        >
          Exclude from Net Asset calculation
        </label>
      </div>

      {accountType === AccountType.BANK_ACCOUNT ? (
        <>
          <FormField
            label="Opening Balance"
            name="openingBalance"
            type="number"
            step="0.01"
            defaultValue={
              account && 'openingBalance' in account
                ? account.openingBalance
                : undefined
            }
          />
          <FormField
            label="Last 4"
            name="last4"
            type="number"
            maxLength={4}
            defaultValue={
              account && 'last4' in account ? account.last4 : undefined
            }
          />
        </>
      ) : null}

      {accountType === AccountType.CREDIT_CARD ? (
        <>
          <FormField
            label="Last 4"
            name="last4"
            type="number"
            maxLength={4}
            defaultValue={
              account && 'last4' in account ? account.last4 : undefined
            }
            required
          />
          <FormField
            label="Credit Limit"
            name="creditLimit"
            type="number"
            step="0.01"
            defaultValue={
              account && 'creditLimit' in account
                ? account.creditLimit
                : undefined
            }
            required
          />
          <FormField
            label="Payment Due Date"
            name="paymentDueDay"
            type="number"
            min={1}
            max={31}
            defaultValue={
              account && 'paymentDueDay' in account
                ? account.paymentDueDay
                : undefined
            }
            required
          />
          <FormField
            label="Grace Period Days"
            name="gracePeriodDays"
            type="number"
            min={0}
            defaultValue={
              account && 'gracePeriodDays' in account
                ? account.gracePeriodDays
                : undefined
            }
            required
          />
          <FormField
            label="Statement Password"
            name="statementPassword"
            type="password"
            defaultValue={
              account && 'statementPassword' in account
                ? account.statementPassword
                : undefined
            }
          />
        </>
      ) : null}
      <div className="pt-2">
        <SubmitButton className="w-full" pending={isSubmitting}>
          {isUpdateMode ? 'Update Account' : 'Create Account'}
        </SubmitButton>
      </div>
    </form>
  );
}

'use client';

import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { useActionState, useEffect, useState } from 'react';

import { createAccount, updateAccount } from '@/actions/accounts';
import { SubmitButton } from '@/components/forms/SubmitButton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FormField } from '@/components/ui/form-field';
import { NativeSelect } from '@/components/ui/native-select';
import { Account } from '@/lib/account.types';
import { AccountType, ApiResult } from '@/lib/types';

const accountTypes: { value: AccountType; label: string }[] = [
  { value: 'bank_account', label: 'Bank Account' },
  { value: 'credit_card', label: 'Credit Card' },
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

  const updateAction = account ? updateAccount.bind(null, account.id) : null;

  const [state, formAction] = useActionState(
    isUpdateMode && updateAction ? updateAction : createAccount,
    null as ApiResult<Account> | null,
  );

  const [accountType, setAccountType] = useState<AccountType>(
    account?.type || 'bank_account'
  );

  useEffect(() => {
    if (account?.type) {
      setAccountType(account.type);
    }
  }, [account]);

  useEffect(() => {
    if (state?.success && onSuccess) {
      onSuccess();
    }
  }, [state?.success, onSuccess]);

  return (
    <form action={formAction} className="space-y-4">
      {state && !state.success && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{state.error.message}</AlertDescription>
        </Alert>
      )}
      {state?.success && (
        <Alert>
          <CheckCircle2 className="h-4 w-4" />
          <AlertDescription>
            {isUpdateMode
              ? 'Account updated successfully!'
              : 'Account created successfully!'}
          </AlertDescription>
        </Alert>
      )}

      <FormField
        label="Account Name"
        name="name"
        placeholder="e.g., HDFC Savings"
        defaultValue={account?.name}
        required
      />

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

      {accountType === 'bank_account' ? (
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

      {accountType === 'credit_card' ? (
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
        <SubmitButton className="w-full">
          {isUpdateMode ? 'Update Account' : 'Create Account'}
        </SubmitButton>
      </div>
    </form>
  );
}

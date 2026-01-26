'use client';

import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { useActionState, useEffect } from 'react';

import { createTransaction, updateTransaction } from '@/actions/transactions';
import { SubmitButton } from '@/components/forms/SubmitButton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { FormField } from '@/components/ui/form-field';
import { FormFieldTextArea } from '@/components/ui/form-field-textarea';
import { NativeSelect } from '@/components/ui/native-select';
import { Account } from '@/lib/account.types';
import { Category } from '@/lib/categories.types';
import { Transaction } from '@/lib/transaction.types';
import type { ApiResult } from '@/lib/types';

interface TransactionFormProps {
  transaction?: Transaction;
  accounts: Account[];
  categories: Category[];
  onSuccess?: () => void;
}

export function TransactionForm({ transaction, accounts, onSuccess }: TransactionFormProps) {
  const isUpdateMode = !!transaction;
  const updateAction = transaction ? updateTransaction.bind(null, transaction.id) : null;

  const [state, formAction] = useActionState(
    isUpdateMode && updateAction ? updateAction : createTransaction,
    null as ApiResult<Transaction> | null,
  );

  const accountOptions = [
    { value: '', label: 'Select account' },
    ...accounts.map((a) => ({ value: a.id, label: a.name })),
  ];

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
          <AlertDescription>Transaction added!</AlertDescription>
        </Alert>
      )}

      <NativeSelect
        label="Account"
        name="accountId"
        options={accountOptions}
        required
        defaultValue={transaction?.accountId}
      />

      <FormField
        label="Amount (INR)"
        name="amount"
        type="number"
        step="0.01"
        placeholder="-ve for expense, +ve for income"
        required
        defaultValue={transaction?.amount}
      />

      <FormField
        label="Description"
        name="description"
        placeholder="e.g., Grocery shopping at BigBasket"
        required
        defaultValue={transaction?.description}
      />

      <FormField
        label="Date"
        name="date"
        type="date"
        defaultValue={transaction?.date ?? new Date().toISOString().split('T')[0]}
        required
      />

      <FormField
        label="Category"
        name="category"
        placeholder="e.g., Food, Transport"
        defaultValue={transaction?.category}
      />

      <FormFieldTextArea
        label="Notes"
        name="notes"
        type="textarea"
        defaultValue={transaction?.notes}
      />

      <input name="source" hidden defaultValue="manual" />

      <div className="pt-2">
        <SubmitButton className="w-full">Add Transaction</SubmitButton>
      </div>
    </form>
  );
}

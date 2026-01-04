'use client';

import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { useFormState } from 'react-dom';

import { createTransaction } from '@/actions/transactions';
import { SubmitButton } from '@/components/forms/submit-button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent,CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { NativeSelect } from '@/components/ui/native-select';
import type {
  AccountResponse,
  ApiResult,
  TransactionResponse,
} from '@/lib/types';

interface CreateTransactionFormProps {
  accounts: AccountResponse[];
}

const transactionSources = [
  { value: 'manual', label: 'Manual Entry' },
  { value: 'gmail', label: 'Gmail Import' },
];

export function CreateTransactionForm({
  accounts,
}: CreateTransactionFormProps) {
  const [state, formAction] = useFormState(
    createTransaction,
    null as ApiResult<TransactionResponse> | null
  );

  const accountOptions = [
    { value: '', label: 'Select account (optional)...' },
    ...accounts.map((a) => ({ value: a.id, label: a.name })),
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Add Transaction</CardTitle>
      </CardHeader>
      <CardContent>
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
          />

          <FormField
            label="Amount (INR)"
            name="amount"
            type="number"
            step="0.01"
            placeholder="-500.00 for expense, 1000.00 for income"
            required
          />

          <FormField
            label="Description"
            name="description"
            placeholder="e.g., Grocery shopping at BigBasket"
            required
          />

          <FormField
            label="Date"
            name="date"
            type="date"
            defaultValue={new Date().toISOString().split('T')[0]}
            required
          />

          <FormField
            label="Category (Optional)"
            name="category"
            placeholder="e.g., Food, Transport"
          />

          <FormField
            label="Subcategory (Optional)"
            name="subcategory"
            placeholder="e.g., Groceries"
          />

          <FormField
            label="Spent For (Optional)"
            name="spentFor"
            placeholder="e.g., Family, Work"
          />

          <NativeSelect
            label="Source"
            name="source"
            options={transactionSources}
            defaultValue="manual"
          />

          <div className="pt-2">
            <SubmitButton className="w-full">Add Transaction</SubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

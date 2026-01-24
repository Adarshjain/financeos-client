'use client';

import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { useActionState } from 'react';

import { createInvestmentTransaction } from '@/actions/investments';
import { SubmitButton } from '@/components/forms/SubmitButton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { NativeSelect } from '@/components/ui/native-select';
import type {
  AccountResponse,
  ApiResult,
  InvestmentTransactionResponse,
} from '@/lib/types';

interface CreateInvestmentFormProps {
  accounts: AccountResponse[];
}

const transactionTypes = [
  { value: '', label: 'Select type...' },
  { value: 'buy', label: 'Buy' },
  { value: 'sell', label: 'Sell' },
];

export function CreateInvestmentForm({ accounts }: CreateInvestmentFormProps) {
  const [state, formAction] = useActionState(
    createInvestmentTransaction,
    null as ApiResult<InvestmentTransactionResponse> | null
  );

  const accountOptions = [
    { value: '', label: 'Select account...' },
    ...accounts.map((a) => ({ value: a.id, label: a.name })),
  ];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Record Trade</CardTitle>
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
              <AlertDescription>Trade recorded!</AlertDescription>
            </Alert>
          )}

          <NativeSelect
            label="Account"
            name="accountId"
            options={accountOptions}
            required
          />

          <NativeSelect
            label="Transaction Type"
            name="type"
            options={transactionTypes}
            required
          />

          <FormField
            label="Quantity"
            name="quantity"
            type="number"
            step="0.0001"
            min="0"
            placeholder="10"
            required
          />

          <FormField
            label="Price per Unit (INR)"
            name="price"
            type="number"
            step="0.01"
            min="0"
            placeholder="2400.00"
            required
          />

          <FormField
            label="Trade Date"
            name="date"
            type="date"
            defaultValue={new Date().toISOString().split('T')[0]}
            required
          />

          <div className="pt-2">
            <SubmitButton className="w-full">Record Trade</SubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

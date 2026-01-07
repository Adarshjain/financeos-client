'use client';

import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { useActionState } from 'react';

import { createAccount } from '@/actions/accounts';
import { SubmitButton } from '@/components/forms/submit-button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { NativeSelect } from '@/components/ui/native-select';
import type { AccountResponse, ApiResult } from '@/lib/types';

const accountTypes = [
  { value: '', label: 'Select type...' },
  { value: 'bank_account', label: 'Bank Account' },
  { value: 'credit_card', label: 'Credit Card' },
  { value: 'stock', label: 'Stock' },
  { value: 'mutual_fund', label: 'Mutual Fund' },
  { value: 'generic', label: 'Generic' },
];

const financialPositions = [
  { value: 'asset', label: 'Asset' },
  { value: 'liability', label: 'Liability' },
];

export function CreateAccountForm() {
  const [state, formAction] = useActionState(
    createAccount,
    null as ApiResult<AccountResponse> | null
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button>Create Account</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add New Account</DialogTitle>
        </DialogHeader>
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
              <AlertDescription>Account created successfully!</AlertDescription>
            </Alert>
          )}

          <FormField
            label="Account Name"
            name="name"
            placeholder="e.g., HDFC Savings"
            required
          />

          <NativeSelect
            label="Account Type"
            name="type"
            options={accountTypes}
            required
          />

          <NativeSelect
            label="Financial Position"
            name="financialPosition"
            options={financialPositions}
            defaultValue="asset"
          />

          <FormField
            label="Description (Optional)"
            name="description"
            placeholder="Brief description of the account"
          />

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="excludeFromNetAsset"
              name="excludeFromNetAsset"
              value="true"
              className="h-4 w-4 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <label
              htmlFor="excludeFromNetAsset"
              className="text-sm text-slate-700 dark:text-slate-300"
            >
              Exclude from Net Asset calculation
            </label>
          </div>

          <div className="pt-2">
            <SubmitButton className="w-full">Create Account</SubmitButton>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { useActionState, useEffect, useRef, useState } from 'react';

import {
  categorizeDescription as categorizeDescriptionAction,
  createCategory as createCategoryAction,
} from '@/actions/categories';
import { createTransaction, updateTransaction } from '@/actions/transactions';
import { Combobox } from '@/components/Combobox';
import { SubmitButton } from '@/components/forms/SubmitButton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/ui/form-field';
import { FormFieldTextArea } from '@/components/ui/form-field-textarea';
import { NativeSelect } from '@/components/ui/native-select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
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

export function TransactionForm({ categories, transaction, accounts, onSuccess }: TransactionFormProps) {
  const isUpdateMode = !!transaction;
  const updateAction = transaction ? updateTransaction.bind(null, transaction.id) : null;
  const [selectedCategories, setSelectedCategories] = useState(transaction?.categories ?? []);
  const [localCategories, setLocalCategories] = useState<Category[]>(categories);
  const [incomeExpense, setIncomeExpense] = useState<string>(() => !transaction ? 'expense' : transaction.amount < 0 ? 'expense' : 'income');
  const formRef = useRef<HTMLFormElement | null>(null);

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

  // Sync local categories when prop changes
  useEffect(() => {
    setLocalCategories(categories);
  }, [categories]);

  const handleFormSubmit = (payload: FormData) => {
    if (incomeExpense === 'expense') {
      payload.set('amount', '' + -parseInt(payload.get('amount') as string | undefined ?? '0', 10));
    }
    payload.set('category', JSON.stringify(selectedCategories));
    formAction(payload);
  };

  const createCategory = async (categoryName: string) => {
    const result = await createCategoryAction(categoryName);
    if (result.success) {
      setLocalCategories((prev) => [...prev, result.data]);
      setSelectedCategories((prev) => [...prev, result.data.id]);
    } else {
      alert('Failed to create category:' + result.error.message);
    }
  };

  const categorizeDescription = async () => {
    const result = await categorizeDescriptionAction(formRef.current?.description.value ?? '');
    if (result.success) {
      setSelectedCategories(result.data.map(category => category.id));
    } else {
      alert('Failed to match category:' + result.error.message);
    }
  };

  return (
    <form ref={formRef} action={handleFormSubmit} className="space-y-4">
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

      <Tabs value={incomeExpense} onValueChange={setIncomeExpense}>
        <TabsList className="w-full">
          <TabsTrigger
            value="income"
            className="w-1/2 data-[state=active]:bg-emerald-400 data-[state=active]:text-white"
          >Income</TabsTrigger>
          <TabsTrigger
            value="expense"
            className="w-1/2 data-[state=active]:bg-red-500 data-[state=active]:text-white"
          >Expense</TabsTrigger>
        </TabsList>
      </Tabs>

      <FormField
        label="Amount"
        name="amount"
        type="text"
        step="0.01"
        required
        defaultValue={transaction?.amount}
        inputMode="decimal"
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
        className="max-w-full"
        defaultValue={transaction?.date ?? new Date().toISOString().split('T')[0]}
        required
      />

      <div className="flex items-end gap-3">
        <Combobox
          label="Categories"
          options={localCategories.map(({ id, name }) => ({ value: id, label: name }))}
          value={selectedCategories}
          onChange={setSelectedCategories}
          canCreate
          onCreate={createCategory}
        />
        <Button disabled variant="outline" onClick={categorizeDescription}>Auto Detect</Button>
      </div>

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

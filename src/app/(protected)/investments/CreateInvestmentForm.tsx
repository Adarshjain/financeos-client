'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { createInvestmentTransaction } from '@/actions/investments';
import { SubmitButton } from '@/components/forms/SubmitButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { NativeSelect } from '@/components/ui/native-select';

interface CreateInvestmentFormProps {
  accounts: any[];
}

const transactionTypes = [
  { value: '', label: 'Select type...' },
  { value: 'buy', label: 'Buy' },
  { value: 'sell', label: 'Sell' },
];

export function CreateInvestmentForm({ accounts }: CreateInvestmentFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const accountOptions = [
    { value: '', label: 'Select account...' },
    ...accounts.map((a) => ({ value: a.id, label: a.name })),
  ];

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setIsSubmitting(true);
    try {
      const res = await createInvestmentTransaction(null, formData);
      if (res.success) {
        toast.success('Trade recorded!');
      } else {
        toast.error(res.error.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Record Trade</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
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
            <SubmitButton className="w-full" pending={isSubmitting}>Record Trade</SubmitButton>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

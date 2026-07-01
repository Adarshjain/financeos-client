'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { createInvestmentTransaction } from '@/actions/investments';
import { SubmitButton } from '@/components/forms/SubmitButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/ui/form-field';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface CreateInvestmentFormProps {
  accounts: any[];
}

export function CreateInvestmentForm({ accounts }: CreateInvestmentFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);

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
          <div className="space-y-1.5">
            <Label>Account</Label>
            <Select name="accountId" required>
              <SelectTrigger className="w-full bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200">
                <SelectValue placeholder="Select account..." />
              </SelectTrigger>
              <SelectContent className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id} className="text-xs hover:bg-slate-50 dark:hover:bg-slate-900">
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label>Transaction Type</Label>
            <Select name="type" required>
              <SelectTrigger className="w-full bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg text-xs font-medium text-slate-700 dark:text-slate-200">
                <SelectValue placeholder="Select type..." />
              </SelectTrigger>
              <SelectContent className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
                <SelectItem value="buy" className="text-xs hover:bg-slate-50 dark:hover:bg-slate-900">Buy</SelectItem>
                <SelectItem value="sell" className="text-xs hover:bg-slate-50 dark:hover:bg-slate-900">Sell</SelectItem>
              </SelectContent>
            </Select>
          </div>

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

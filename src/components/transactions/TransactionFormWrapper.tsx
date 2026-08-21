'use client';

import { JSX, useState } from 'react';

import TransactionCRUD from '@/components/transactions/TransactionCRUD';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Account } from '@/lib/account.types';
import { Category } from '@/lib/categories.types';
import { Transaction } from '@/lib/transaction.types';

interface TransactionFormWrapperProps {
  accounts: Account[];
  categories: Category[];
  transaction?: Transaction;
  trigger: JSX.Element;
  onSuccess?: () => void;
}

export function TransactionFormWrapper({ transaction, categories, accounts, trigger, onSuccess }: TransactionFormWrapperProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger ?? <div></div>}</DialogTrigger>
      <DialogContent
        showCloseButton={false}
        onOpenAutoFocus={(e) => e.preventDefault()}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>{transaction ? 'Edit' : 'New'} Transaction</DialogTitle>
        </DialogHeader>
        <TransactionCRUD
          accounts={accounts}
          transaction={transaction}
          categories={categories}
          onSuccess={() => {
            setOpen(false);
            onSuccess?.();
          }}
          onClose={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

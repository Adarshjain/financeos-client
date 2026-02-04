'use client';

import React, { JSX, useState } from 'react';

import TransactionCRUD from '@/components/transactions/TransactionCRUD';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Account } from '@/lib/account.types';
import { Category } from '@/lib/categories.types';
import { Transaction } from '@/lib/transaction.types';

interface EditAccountFormProps {
  accounts: Account[];
  categories: Category[];
  transaction?: Transaction;
  trigger: JSX.Element;
}

export function TransactionFormWrapper({ transaction, categories, accounts, trigger }: EditAccountFormProps) {
  const [open, setOpen] = useState(false);

  return (
    <div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <div>{trigger}</div>
        </DialogTrigger>
        <DialogContent
          className="rounded-none top-0 bottom-0 h-[100vh] p-0"
          hideClose
          onOpenAutoFocus={(e) => e.preventDefault()}
        >
          <DialogHeader className="sr-only">
            <DialogTitle>{transaction ? 'Edit' : 'New'} Transaction</DialogTitle>
          </DialogHeader>
          <TransactionCRUD
            accounts={accounts}
            transaction={transaction}
            categories={categories}
            onSuccess={() => setOpen(false)}
            onClose={() => setOpen(false)}
          />
          {/*<TransactionForm*/}
          {/*  accounts={accounts}*/}
          {/*  transaction={transaction}*/}
          {/*  categories={categories}*/}
          {/*  onSuccess={() => setOpen(false)}*/}
          {/*/>*/}
        </DialogContent>
      </Dialog>
    </div>
  );
}

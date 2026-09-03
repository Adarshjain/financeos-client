'use client';

import { JSX, useState } from 'react';

import TransactionCRUD from '@/components/transactions/TransactionCRUD';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Transaction } from '@/lib/transaction.types';

interface TransactionFormWrapperProps {
  transaction?: Transaction;
  trigger: JSX.Element;
  onSuccess?: () => void;
}

export function TransactionFormWrapper({ transaction, trigger, onSuccess }: TransactionFormWrapperProps) {
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
          transaction={transaction}
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

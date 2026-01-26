'use client';

import React, { JSX, useState } from 'react';

import { TransactionForm } from '@/components/transactions/TransactionForm';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Account } from '@/lib/account.types';


interface EditAccountFormProps {
  accounts: Account[];
  trigger: JSX.Element;
}

export function TransactionFormWrapper({ accounts, trigger }: EditAccountFormProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Account</DialogTitle>
        </DialogHeader>
        <TransactionForm accounts={accounts} onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

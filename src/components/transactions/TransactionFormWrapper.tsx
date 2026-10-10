'use client';

import { JSX, useState } from 'react';

import TransactionCRUD from '@/components/transactions/TransactionCRUD';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Transaction } from '@/lib/transaction.types';

interface TransactionFormWrapperProps {
  transaction?: Transaction;
  /** Opens the dialog on click (uncontrolled). Omit when the caller controls `open`. */
  trigger?: JSX.Element;
  /** Controlled mode: the caller owns the open state (e.g. a lazily loaded shortcut action). */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: () => void;
}

export function TransactionFormWrapper({
  transaction,
  trigger,
  open: openProp,
  onOpenChange,
  onSuccess,
}: TransactionFormWrapperProps) {
  const [openState, setOpenState] = useState(false);
  const controlled = openProp !== undefined;
  const open = controlled ? openProp : openState;
  const setOpen = (next: boolean) => {
    if (!controlled) setOpenState(next);
    onOpenChange?.(next);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
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

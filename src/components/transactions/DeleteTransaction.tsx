'use client';

import { Trash2 } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import { Transaction } from '@/lib/transaction.types';

import { DeleteTransactionDialog } from './DeleteTransactionDialog';

interface DeleteTransactionProps {
  transaction: Transaction;
  onSuccess?: () => void;
}

export const DeleteTransaction = ({ transaction, onSuccess }: DeleteTransactionProps) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="flex-1 w-full hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/20 dark:hover:text-rose-400 hover:border-rose-200 dark:hover:border-rose-900/30"
      >
        <Trash2 className="h-3.5 w-3.5" />
        Delete
      </Button>

      <DeleteTransactionDialog
        transaction={transaction}
        open={open}
        onOpenChange={setOpen}
        onSuccess={onSuccess}
      />
    </>
  );
};

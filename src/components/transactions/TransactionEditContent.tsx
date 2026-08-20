'use client';

import TransactionCRUD from '@/components/transactions/TransactionCRUD';
import { DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Account } from '@/lib/account.types';
import { Category } from '@/lib/categories.types';
import { Transaction } from '@/lib/transaction.types';

interface TransactionEditContentProps {
  transaction: Transaction;
  accounts: Account[];
  categories: Category[];
  onSuccess: () => void;
  onCancel: () => void;
}

export const TransactionEditContent = ({
  transaction,
  accounts,
  categories,
  onSuccess,
  onCancel,
}: TransactionEditContentProps) => {
  return (
    <>
      <DialogHeader className="px-6 pt-4 pb-2 border-b border-slate-100 dark:border-slate-900 bg-white dark:bg-slate-900 shrink-0 sr-only">
        <DialogTitle className="text-xl font-bold flex items-center">
          Edit Transaction
        </DialogTitle>
      </DialogHeader>
      <TransactionCRUD
        accounts={accounts}
        transaction={transaction}
        categories={categories}
        onSuccess={onSuccess}
        onClose={onCancel}
      />
    </>
  );
};

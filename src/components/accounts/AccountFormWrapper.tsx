'use client';

import { JSX, useState } from 'react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Account } from '@/lib/account.types';

import { AccountForm } from './AccountForm';

interface EditAccountFormProps {
  account?: Account;
  trigger: JSX.Element;
}

export function AccountFormWrapper({ account, trigger }: EditAccountFormProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent
        className="w-full sm:max-w-lg"
        showCloseButton={false}
      >
        <DialogHeader className="sr-only">
          <DialogTitle>Edit Account</DialogTitle>
        </DialogHeader>
        <AccountForm account={account} onSuccess={() => setOpen(false)} onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

'use client';

import React, { JSX, useState } from 'react';

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
        className="h-screen max-h-screen rounded-none bottom-0 top-0 border-none p-0 flex flex-col gap-0 sm:h-auto sm:max-h-[85vh] sm:rounded-lg sm:border sm:max-w-lg"
        hideClose
      >
        <DialogHeader>
          <DialogTitle className="sr-only">Edit Account</DialogTitle>
        </DialogHeader>
        <AccountForm account={account} onSuccess={() => setOpen(false)} onClose={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

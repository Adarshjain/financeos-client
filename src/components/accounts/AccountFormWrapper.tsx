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
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Edit Account</DialogTitle>
        </DialogHeader>
        <AccountForm account={account} onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

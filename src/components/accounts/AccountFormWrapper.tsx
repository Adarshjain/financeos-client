'use client';

import { ReactNode, useState } from 'react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Account } from '@/lib/account.types';
import { cn } from '@/lib/utils';

import { AccountForm } from './AccountForm';

interface AccountFormWrapperProps {
  account?: Account;
  /** Classes for the trigger itself — the trigger IS the interactive element, so style it, not a wrapper. */
  triggerClassName?: string;
  children: ReactNode;
}

export function AccountFormWrapper({ account, triggerClassName, children }: AccountFormWrapperProps) {
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {/*
        Deliberately NOT `asChild`, and the content is `children` rather than a `trigger` prop.

        An account tile's body is a large subtree rendered by a Server Component. Passing it as a prop
        into this Client Component sends it across the RSC boundary, where Radix's `Slot` (what `asChild`
        uses) clones the element to merge trigger props onto it — and the clone drops the streamed
        children. The tile then paints as an empty box with only its footer showing. Small triggers
        survive because their children are inlined in the payload rather than streamed, which is why the
        bank tiles and the icon buttons looked fine while the credit-card tiles did not.

        Rendering a real <button> and letting children through normally avoids the clone entirely and
        keeps Radix's trigger wiring (aria-haspopup / aria-expanded / focus return) intact.
      */}
      <DialogTrigger className={cn('text-left', triggerClassName)}>
        {children}
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

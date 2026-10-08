'use client';

import { FileText, Pencil, Upload } from 'lucide-react';
import Link from 'next/link';

import { AccountFormWrapper } from '@/components/accounts/AccountFormWrapper';
import { StatementsDialog } from '@/components/accounts/StatementsDialog';
import { buttonVariants } from '@/components/ui/button';
import { type Account, isAccountClosed, supportsIngestion } from '@/lib/account.types';
import { cn } from '@/lib/utils';

export function AccountActions({ account }: { account: Account }) {
  const ingest = supportsIngestion(account.type);
  return (
    <div className="flex flex-wrap gap-2">
      <AccountFormWrapper
        account={account}
        triggerClassName={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}
      >
        <Pencil className="w-3.5 h-3.5" />
        Edit
      </AccountFormWrapper>
      {ingest ? (
        <StatementsDialog
          account={account}
          trigger={
            <button
              type="button"
              suppressHydrationWarning
              className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}
            >
              <FileText className="w-3.5 h-3.5" />
              Statements
            </button>
          }
        />
      ) : null}
      {ingest && !isAccountClosed(account) ? (
        <Link
          href={`/transactions/import?account=${account.id}`}
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'gap-1.5')}
        >
          <Upload className="w-3.5 h-3.5" />
          Import
        </Link>
      ) : null}
    </div>
  );
}

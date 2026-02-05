'use client';

import { Trash2 } from 'lucide-react';
import { JSX, useState } from 'react';
import { toast } from 'sonner';

import { deleteAccount } from '@/actions/accounts';
import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import { Button } from '@/components/ui/button';
import { Account } from '@/lib/account.types';

interface DeleteAccountProps {
  account: Account;
  trigger?: JSX.Element;
}

export function DeleteAccount({ account, trigger }: DeleteAccountProps) {
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);

    try {
      await deleteAccount(account.id);
      toast.success('Account deleted!');
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsDeleting(false);
    }
  };

  const defaultTrigger = (
    <Button variant="destructive" size="sm">
      <Trash2 className="h-4 w-4" />
      Delete
    </Button>
  );

  return (<>
      <ConfirmationDialog
        title="Delete Account"
        description={
          <div>Are you sure you want to delete <strong>{account.name}</strong>? This action cannot be undone.</div>
        }
        primaryActionText={isDeleting ? 'Deleting...' : 'Delete'}
        trigger={trigger || defaultTrigger}
        primaryAction={handleDelete}
        loading={isDeleting}
      />
    </>
  );
}

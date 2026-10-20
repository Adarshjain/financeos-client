'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';

import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { useAccounts } from '@/lib/query/hooks/useAccounts';

import { useGmailMutations } from './useGmailMutations';

interface AssignAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: { id: string; extractedLast4?: string | null } | null;
}

export function AssignAccountDialog({
  open,
  onOpenChange,
  item,
}: AssignAccountDialogProps) {
  const { data: accounts, isLoading: loadingAccounts } = useAccounts();
  const { assignAttentionMutation } = useGmailMutations();

  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const effectiveAccountId = selectedAccountId || accounts?.[0]?.id || '';

  if (!item) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveAccountId) {
      setErrorMessage('Please select an account.');
      return;
    }

    setErrorMessage(null);
    try {
      const res = await assignAttentionMutation.mutateAsync({
        ledgerId: item.id,
        body: { accountId: effectiveAccountId },
      });

      if (res?.reactivatedCount && res.reactivatedCount > 0) {
        toast.success(`Re-processing ${res.reactivatedCount} parked emails`);
      } else {
        toast.success('Account identifier assigned');
      }

      onOpenChange(false);
    } catch (err) {
      const msg = getErrorMessage(err, 'Failed to assign identifier to account');
      setErrorMessage(msg);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Assign Account Identifier</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          <DialogBody>
            <div className="space-y-4 pt-1">
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Emails referencing <span className="font-semibold text-slate-700 dark:text-slate-300">••{item.extractedLast4 || '????'}</span> will be remembered for this account.
              </p>

              {errorMessage && (
                <div
                  role="alert"
                  className="p-3 rounded-lg text-xs bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:border-rose-900/60 dark:text-rose-300"
                >
                  {errorMessage}
                </div>
              )}

              <div className="space-y-1.5">
                <Label htmlFor="target-account" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Target Account
                </Label>
                <Select
                  value={effectiveAccountId || undefined}
                  onValueChange={(val) => {
                    setSelectedAccountId(val);
                    setErrorMessage(null);
                  }}
                  disabled={loadingAccounts || assignAttentionMutation.isPending}
                >
                  <SelectTrigger id="target-account" className="text-xs">
                    <SelectValue placeholder={loadingAccounts ? 'Loading accounts...' : 'Select an account'} />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts?.map((acc) => (
                      <SelectItem key={acc.id} value={acc.id} className="text-xs">
                        {acc.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

            </div>
          </DialogBody>

          <DialogFooter
            primaryAction={{
              label: assignAttentionMutation.isPending ? 'Assigning...' : 'Assign & Remember',
              type: 'submit',
              disabled: assignAttentionMutation.isPending || !effectiveAccountId,
            }}
            secondaryAction={{
              label: 'Cancel',
              disabled: assignAttentionMutation.isPending,
            }}
          />
        </form>
      </DialogContent>
    </Dialog>
  );
}

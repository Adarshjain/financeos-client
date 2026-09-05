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
import type { AccountIdentifierKind } from '@/lib/types';

import { useGmailMutations } from './useGmailMutations';

interface AssignAccountDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item: { id: string; extractedLast4?: string | null } | null;
}

const KIND_OPTIONS: { value: AccountIdentifierKind; label: string }[] = [
  { value: 'CUSTOMER_ID', label: 'Customer ID / CIF' },
  { value: 'ACCOUNT_NUMBER', label: 'Account Number' },
  { value: 'CRN', label: 'CRN (Customer Reference Number)' },
  { value: 'OTHER', label: 'Other' },
];

export function AssignAccountDialog({
  open,
  onOpenChange,
  item,
}: AssignAccountDialogProps) {
  const { data: accounts, isLoading: loadingAccounts } = useAccounts();
  const { assignAttentionMutation } = useGmailMutations();

  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [selectedKind, setSelectedKind] = useState<AccountIdentifierKind>('CUSTOMER_ID');
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
        body: {
          accountId: effectiveAccountId,
          kind: selectedKind,
        },
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

              <div className="space-y-1.5">
                <Label htmlFor="identifier-kind" className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  Identifier Type
                </Label>
                <Select
                  value={selectedKind}
                  onValueChange={(val) => setSelectedKind(val as AccountIdentifierKind)}
                  disabled={assignAttentionMutation.isPending}
                >
                  <SelectTrigger id="identifier-kind" className="text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {KIND_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value} className="text-xs">
                        {opt.label}
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

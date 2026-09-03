'use client';

import { useQuery } from '@tanstack/react-query';
import { AlertTriangle, Loader2, Trash2 } from 'lucide-react';
import { useState } from 'react';

import { deleteAccount } from '@/app/(protected)/settings/actions';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FormField } from '@/components/ui/form-field';
import { api } from '@/lib/api/client';
import { keys } from '@/lib/query/keys';
import type { DeletionSummaryResponse, UserResponse } from '@/lib/types';

interface DeleteAccountCardProps {
  user: UserResponse;
}

export function DeleteAccountCard({ user }: DeleteAccountCardProps) {
  const [open, setOpen] = useState(false);

  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: keys.settings.deletionSummary(),
    queryFn: async () => {
      const { data } = await api.GET('/api/v1/auth/me/deletion-summary');
      return data ?? null;
    },
    enabled: open,
    // A failed summary must not block the deletion flow — no retries needed.
    retry: false,
  });

  const [password, setPassword] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [confirmPhrase, setConfirmPhrase] = useState('');

  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const hasPassword = !!user.hasPassword;

  const handleOpen = () => {
    setPassword('');
    setConfirmEmail('');
    setConfirmPhrase('');
    setError(null);
    setIsBusy(false);
    setOpen(true);
  };

  const isAuthValid = hasPassword
    ? password.trim().length > 0
    : confirmEmail.trim().toLowerCase() === user.email.toLowerCase();

  const isPhraseValid = confirmPhrase.trim() === 'DELETE';
  const canSubmit = isAuthValid && isPhraseValid && !isDeleting;

  const handleDelete = async () => {
    if (!canSubmit) return;
    setIsDeleting(true);
    setError(null);
    setIsBusy(false);

    try {
      const res = await deleteAccount({
        password: hasPassword ? password : undefined,
        confirmEmail: !hasPassword ? confirmEmail.trim() : undefined,
      });

      if (!res.success) {
        setIsDeleting(false);
        // Match on the code, not the message: the message is human copy that will be
        // reworded, and matching it by substring silently stops working when it is.
        setIsBusy(res.error.code === 'ACCOUNT_DELETE_BUSY');
        setError(res.error.message || 'Failed to delete account');
      }
      // If success, Next.js action redirects to /login?deleted=1
    } catch (e: unknown) {
      // In Next.js, redirect throws a NEXT_REDIRECT digest which must not be caught as an error
      const digest = e instanceof Error ? (e as Error & { digest?: string }).digest : undefined;
      if (digest?.startsWith('NEXT_REDIRECT')) {
        throw e;
      }
      setIsDeleting(false);
      setError(e instanceof Error ? e.message : 'An unexpected error occurred');
    }
  };

  const formatSummaryText = (summaryData: DeletionSummaryResponse) => {
    const parts: string[] = [];
    const counts = summaryData.counts;

    if (counts.accounts) {
      parts.push(`${counts.accounts.toLocaleString()} account${counts.accounts === 1 ? '' : 's'}`);
    }
    if (counts.transactions) {
      parts.push(`${counts.transactions.toLocaleString()} transaction${counts.transactions === 1 ? '' : 's'}`);
    }
    if (counts.holdings || counts.investment_transactions) {
      const invCount = (counts.holdings || 0) + (counts.investment_transactions || 0);
      parts.push(`${invCount.toLocaleString()} investment record${invCount === 1 ? '' : 's'}`);
    }
    if (counts.loans || counts.lendings) {
      const loanCount = (counts.loans || 0) + (counts.lendings || 0);
      parts.push(`${loanCount.toLocaleString()} loan / lending record${loanCount === 1 ? '' : 's'}`);
    }
    if (counts.category_rules || counts.reward_rules) {
      const ruleCount = (counts.category_rules || 0) + (counts.reward_rules || 0);
      parts.push(`${ruleCount.toLocaleString()} rule${ruleCount === 1 ? '' : 's'}`);
    }

    if (parts.length === 0) {
      return summaryData.total > 0
        ? `${summaryData.total.toLocaleString()} total associated records`
        : 'No financial records found';
    }

    return parts.join(' · ');
  };

  return (
    <>
      <Card className="rounded-xl border border-rose-200/80 dark:border-rose-900/40 bg-rose-50/20 dark:bg-rose-950/10 shadow-sm overflow-hidden">
        <CardContent className="p-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1">
              <h2 className="text-base font-semibold text-rose-900 dark:text-rose-200">
                Danger Zone
              </h2>
              <p className="text-xs text-rose-700/80 dark:text-rose-300/70">
                Permanently delete your account and all associated financial data. This action is irreversible.
              </p>
            </div>
            <Button
              variant="destructive"
              onClick={handleOpen}
              className="shrink-0"
            >
              <Trash2 className="w-4 h-4 mr-1.5" />
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={open}
        onOpenChange={(val) => {
          if (isDeleting) return; // Prevent closing while in flight
          setOpen(val);
        }}
      >
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-rose-950 dark:text-rose-200 flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-rose-600 dark:text-rose-400" />
              Delete Account Permanently
            </DialogTitle>
            <DialogDescription>
              This hard deletion is immediate, permanent, and cannot be undone.
            </DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-4 text-xs text-slate-600 dark:text-slate-300">
            {loadingSummary ? (
              <div className="flex items-center gap-2 p-3 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 animate-pulse">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Calculating data to be deleted...</span>
              </div>
            ) : summary ? (
              <div className="p-3 rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/40 text-rose-900 dark:text-rose-200">
                <p className="font-semibold mb-0.5">Records to be deleted:</p>
                <p className="text-xs text-rose-700 dark:text-rose-300">{formatSummaryText(summary)}</p>
              </div>
            ) : null}

            <ul className="list-disc pl-5 space-y-1.5 text-slate-700 dark:text-slate-300">
              <li>All accounts, transactions, investments, categories, and rules will be permanently erased.</li>
              <li>Google OAuth permissions and Gmail connections will be revoked.</li>
              <li>Stored LLM API keys and task configurations will be destroyed.</li>
              <li>Point-in-time encrypted database backups will age out on standard retention.</li>
              <li>You will be immediately signed out across all active devices.</li>
            </ul>

            {isBusy ? (
              <Alert variant="destructive" className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900 text-amber-900 dark:text-amber-200">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : error ? (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            ) : null}

            <div className="space-y-3 pt-2 border-t border-slate-200 dark:border-slate-800">
              {hasPassword ? (
                <FormField
                  label="Current Password"
                  name="delete-account-password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your account password"
                  autoComplete="current-password"
                  disabled={isDeleting}
                />
              ) : (
                <FormField
                  label="Confirm Email Address"
                  name="delete-account-email"
                  type="email"
                  value={confirmEmail}
                  onChange={(e) => setConfirmEmail(e.target.value)}
                  placeholder={`Type "${user.email}" to confirm`}
                  disabled={isDeleting}
                  hint="Enter your account email exactly to verify identity"
                />
              )}

              <FormField
                label='Type "DELETE" to confirm'
                name="delete-account-phrase"
                type="text"
                value={confirmPhrase}
                onChange={(e) => setConfirmPhrase(e.target.value)}
                placeholder="DELETE"
                disabled={isDeleting}
              />
            </div>
          </DialogBody>

          <DialogFooter
            secondaryAction={{
              label: 'Cancel',
              disabled: isDeleting,
              onClick: () => setOpen(false),
            }}
            primaryAction={{
              label: isDeleting ? 'Deleting Account...' : isBusy ? 'Retry Deletion' : 'Permanently Delete Account',
              variant: 'destructive',
              disabled: !canSubmit,
              onClick: handleDelete,
            }}
          />
        </DialogContent>
      </Dialog>
    </>
  );
}

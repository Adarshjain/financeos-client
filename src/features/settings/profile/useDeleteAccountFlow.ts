import { useState } from 'react';

import { watchSession } from '@/lib/authExpiry';
import type { UserResponse } from '@/lib/types';

import { deleteAccount } from './actions';
import { useDeletionSummary } from './useDeletionSummary';

/** The delete-account dialog's state and submit: summary, fields, validation, busy/error handling. */
export function useDeleteAccountFlow(user: Pick<UserResponse, 'email' | 'hasPassword'>, { toDinero = false } = {}) {
  const [open, setOpen] = useState(false);
  const { data: summary, isLoading: loadingSummary } = useDeletionSummary(open);

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
      const res = await watchSession(deleteAccount({
        password: hasPassword ? password : undefined,
        confirmEmail: !hasPassword ? confirmEmail.trim() : undefined,
      }, toDinero));

      if (!res.success) {
        setIsDeleting(false);
        // Match on the code, not the message: the message is human copy that will be
        // reworded, and matching it by substring silently stops working when it is.
        setIsBusy(res.error.code === 'ACCOUNT_DELETE_BUSY');
        setError(res.error.message || "Couldn't delete the account. Try again.");
      }
      // If success, Next.js action redirects to /login?deleted=1
    } catch (e: unknown) {
      // In Next.js, redirect throws a NEXT_REDIRECT digest which must not be caught as an error
      const digest = e instanceof Error ? (e as Error & { digest?: string }).digest : undefined;
      if (digest?.startsWith('NEXT_REDIRECT')) {
        throw e;
      }
      setIsDeleting(false);
      setError(e instanceof Error ? e.message : "Couldn't delete the account. Try again.");
    }
  };

  /** Closing is ignored while the deletion is in flight. */
  const handleOpenChange = (val: boolean) => {
    if (isDeleting) return;
    setOpen(val);
  };

  return {
    open,
    summary,
    loadingSummary,
    hasPassword,
    password,
    setPassword,
    confirmEmail,
    setConfirmEmail,
    confirmPhrase,
    setConfirmPhrase,
    isDeleting,
    isBusy,
    error,
    canSubmit,
    handleOpen,
    handleDelete,
    handleOpenChange,
    close: () => setOpen(false),
  };
}

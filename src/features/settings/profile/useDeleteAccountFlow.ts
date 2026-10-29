import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';

import { ActionError, unwrapAction } from '@/lib/actionResult';
import { getErrorMessage } from '@/lib/api/errorMessage';
import type { UserResponse } from '@/lib/types';

import { deleteAccount } from './profileActions';
import { useDeletionSummary } from './useDeletionSummary';

/** The delete-account dialog's state and submit: summary, fields, validation, busy/error handling. */
export function useDeleteAccountFlow(user: Pick<UserResponse, 'email' | 'hasPassword'>, { toDinero = false } = {}) {
  const [open, setOpen] = useState(false);
  const { data: summary, isLoading: loadingSummary } = useDeletionSummary(open);

  const [password, setPassword] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');
  const [confirmPhrase, setConfirmPhrase] = useState('');

  const [error, setError] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  const hasPassword = !!user.hasPassword;

  const deleteMutation = useMutation({
    mutationFn: () =>
      unwrapAction(
        deleteAccount(
          {
            password: hasPassword ? password : undefined,
            confirmEmail: !hasPassword ? confirmEmail.trim() : undefined,
          },
          toDinero,
        ),
      ),
    // On success the action redirects to /login?deleted=1.
    onError: (e) => {
      // In Next.js, redirect throws a NEXT_REDIRECT digest which is not an error to show.
      const digest = e instanceof Error ? (e as Error & { digest?: string }).digest : undefined;
      if (digest?.startsWith('NEXT_REDIRECT')) return;
      // Match on the code, not the message: the message is human copy that will be
      // reworded, and matching it by substring silently stops working when it is.
      setIsBusy(e instanceof ActionError && e.code === 'ACCOUNT_DELETE_BUSY');
      setError(getErrorMessage(e, "Couldn't delete the account. Try again."));
    },
  });
  const isDeleting = deleteMutation.isPending;

  const handleOpen = () => {
    setPassword('');
    setConfirmEmail('');
    setConfirmPhrase('');
    setError(null);
    setIsBusy(false);
    deleteMutation.reset();
    setOpen(true);
  };

  const isAuthValid = hasPassword
    ? password.trim().length > 0
    : confirmEmail.trim().toLowerCase() === user.email.toLowerCase();

  const isPhraseValid = confirmPhrase.trim() === 'DELETE';
  const canSubmit = isAuthValid && isPhraseValid && !isDeleting;

  const handleDelete = () => {
    if (!canSubmit) return;
    setError(null);
    setIsBusy(false);
    deleteMutation.mutate();
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

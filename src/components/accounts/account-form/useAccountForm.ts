'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { Account, AccountRequest } from '@/lib/account.types';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { optionalDecimal, optionalString } from '@/lib/forms';
import { AccountType, FinancialPosition } from '@/lib/types';
import { getAccountTypeLabel } from '@/lib/utils';

import { useAccountFormMutations } from './useAccountFormMutations';

interface UseAccountFormOptions {
  account?: Account;
  onSuccess?: () => void;
  onClose?: () => void;
}

export function useAccountForm({ account, onSuccess, onClose }: UseAccountFormOptions) {
  const {
    createAccountMutation,
    updateAccountMutation,
    closeAccountMutation,
    reopenAccountMutation,
    deleteAccountMutation,
    previewGmailCleanupMutation,
    executeGmailCleanupMutation,
  } = useAccountFormMutations();

  const isUpdateMode = !!account;
  const [accountType, setAccountType] = useState<AccountType>(
    account?.type || AccountType.BANK_ACCOUNT
  );
  const [excludeFromNetAsset, setExcludeFromNetAsset] = useState<boolean>(
    account?.excludeFromNetAsset || false
  );
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [confirmCleanup, setConfirmCleanup] = useState<{
    count: number;
    before: string;
    accountData: AccountRequest;
  } | null>(null);

  const [closeOnDate, setCloseOnDate] = useState(new Date().toISOString().split('T')[0]);
  const [showCloseInline, setShowCloseInline] = useState(false);

  /**
   * Re-syncs the editable `accountType`/`excludeFromNetAsset` fields whenever
   * the `account` prop's identity changes (e.g. a fresh object from a
   * query-cache refetch after a mutation) — adjusted during render rather
   * than in a `useEffect`, per the "adjusting state when a prop changes"
   * pattern, so it doesn't cause an extra commit-then-effect render pass.
   */
  const [syncedAccount, setSyncedAccount] = useState(account);
  if (account !== syncedAccount) {
    setSyncedAccount(account);
    if (account?.type) {
      setAccountType(account.type);
    }
    if (account) {
      setExcludeFromNetAsset(account.excludeFromNetAsset || false);
    }
  }

  const defaultIngestFromDate = account
    ? account.ingestFromDate
      ? account.ingestFromDate.split('T')[0]
      : ''
    : undefined;

  const isSubmitting =
    createAccountMutation.isPending ||
    updateAccountMutation.isPending ||
    previewGmailCleanupMutation.isPending ||
    executeGmailCleanupMutation.isPending;
  const isDeleting = deleteAccountMutation.isPending;
  const isClosingAccount = closeAccountMutation.isPending;
  const isReopeningAccount = reopenAccountMutation.isPending;

  const handleCloseAccount = async () => {
    if (!account) return;
    try {
      const closed = await closeAccountMutation.mutateAsync({ id: account.id, body: { closedOn: closeOnDate || undefined } });
      if (closed.warnings && closed.warnings.length > 0) {
        toast.warning(closed.warnings.join('; '));
      } else {
        toast.success('Account closed successfully');
      }
      setShowDeleteConfirm(false);
      onSuccess?.();
      onClose?.();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to close account'));
    }
  };

  const handleReopenAccount = async () => {
    if (!account) return;
    try {
      await reopenAccountMutation.mutateAsync(account.id);
      toast.success('Account reopened successfully');
      onSuccess?.();
      onClose?.();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to reopen account'));
    }
  };

  const handleDelete = async () => {
    if (!account) return;
    try {
      await deleteAccountMutation.mutateAsync(account.id);
      toast.success('Account deleted!');
      setShowDeleteConfirm(false);
      onSuccess?.();
      onClose?.();
    } catch (error) {
      toast.error(getErrorMessage(error, 'Failed to delete account'));
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);

    const name = formData.get('name') as string;
    const financialPosition = (formData.get('financialPosition') as FinancialPosition) || 'asset';
    const description = formData.get('description') as string | undefined;
    const ingestFromDateVal = formData.get('ingestFromDate') as string | null;
    const ingestFromDate = ingestFromDateVal && ingestFromDateVal.trim() ? ingestFromDateVal.trim() : null;

    let data: AccountRequest | undefined;
    const statementPasswordVal = formData.get('statementPassword') as string;

    if (accountType === AccountType.BANK_ACCOUNT) {
      data = {
        name,
        excludeFromNetAsset,
        financialPosition,
        description,
        ingestFromDate,
        type: AccountType.BANK_ACCOUNT,
        last4: (formData.get('last4') as string) ?? undefined,
        openingBalance: optionalDecimal(formData, 'openingBalance'),
        ...(statementPasswordVal ? { statementPassword: statementPasswordVal } : {}),
      };
    }

    if (accountType === AccountType.CREDIT_CARD) {
      const last4 = optionalString(formData, 'last4');
      const creditLimit = optionalDecimal(formData, 'creditLimit');
      const anniversaryDate = optionalString(formData, 'anniversaryDate');

      if (
        last4 === undefined ||
        creditLimit === undefined ||
        anniversaryDate === undefined
      ) {
        const missing = [
          last4 === undefined ? 'last 4 digits' : null,
          creditLimit === undefined ? 'credit limit' : null,
          anniversaryDate === undefined ? 'anniversary date' : null,
        ].filter((field): field is string => field !== null);
        toast.error(`Credit card needs ${missing.join(', ')}.`);
        return;
      }

      data = {
        name,
        excludeFromNetAsset,
        financialPosition,
        description,
        ingestFromDate,
        type: AccountType.CREDIT_CARD,
        last4,
        creditLimit,
        anniversaryDate,
        ...(statementPasswordVal ? { statementPassword: statementPasswordVal } : {}),
      };
    }

    if (accountType === AccountType.BROKER) {
      const provider = optionalString(formData, 'provider');
      if (!provider) {
        toast.error('Broker provider is required.');
        return;
      }
      const clientId = optionalString(formData, 'clientId');
      const cashBalance = optionalDecimal(formData, 'cashBalance') ?? 0;

      data = {
        name,
        excludeFromNetAsset,
        financialPosition,
        description,
        ingestFromDate,
        type: AccountType.BROKER,
        provider,
        clientId,
        cashBalance,
      };
    }

    if (accountType === AccountType.GENERIC) {
      data = {
        name,
        excludeFromNetAsset,
        financialPosition,
        description,
        ingestFromDate,
        type: AccountType.GENERIC,
      };
    }

    if (!data) {
      toast.error(`Editing ${getAccountTypeLabel(accountType)} accounts isn't supported yet.`);
      return;
    }

    if (
      isUpdateMode &&
      account &&
      account.ingestFromDate &&
      ingestFromDate &&
      ingestFromDate > account.ingestFromDate.split('T')[0]
    ) {
      try {
        const preview = await previewGmailCleanupMutation.mutateAsync({ accountId: account.id, before: ingestFromDate });
        if (preview.count > 0) {
          setConfirmCleanup({ count: preview.count, before: ingestFromDate, accountData: data });
          return;
        }
      } catch (err) {
        toast.error(getErrorMessage(err, 'Failed to preview Gmail cleanup'));
        return;
      }
    }

    try {
      if (isUpdateMode && account) {
        await updateAccountMutation.mutateAsync({ id: account.id, body: data });
      } else {
        await createAccountMutation.mutateAsync(data);
      }
      toast.success(isUpdateMode ? 'Account updated successfully!' : 'Account created successfully!');
      onSuccess?.();
    } catch (err) {
      toast.error(getErrorMessage(err, isUpdateMode ? 'Failed to update account' : 'Failed to create account'));
    }
  };

  const handleConfirmCleanup = async () => {
    if (!confirmCleanup || !account) return;
    try {
      await executeGmailCleanupMutation.mutateAsync({ accountId: account.id, before: confirmCleanup.before });
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to execute Gmail cleanup'));
      return;
    }
    try {
      await updateAccountMutation.mutateAsync({ id: account.id, body: confirmCleanup.accountData });
      toast.success('Account updated and transactions cleaned up successfully!');
      setConfirmCleanup(null);
      onSuccess?.();
    } catch (err) {
      toast.error(getErrorMessage(err, 'Failed to update account'));
    }
  };

  return {
    isUpdateMode,
    accountType,
    setAccountType,
    excludeFromNetAsset,
    setExcludeFromNetAsset,
    showPassword,
    setShowPassword,
    isSubmitting,
    showDeleteConfirm,
    setShowDeleteConfirm,
    isDeleting,
    confirmCleanup,
    setConfirmCleanup,
    isClosingAccount,
    isReopeningAccount,
    closeOnDate,
    setCloseOnDate,
    showCloseInline,
    setShowCloseInline,
    defaultIngestFromDate,
    handleCloseAccount,
    handleReopenAccount,
    handleDelete,
    handleSubmit,
    handleConfirmCleanup,
  };
}

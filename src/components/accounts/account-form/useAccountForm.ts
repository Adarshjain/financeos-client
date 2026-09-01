'use client';

import { useEffect, useState } from 'react';
import { toast } from 'sonner';

import {
  closeAccount,
  createAccount,
  deleteAccount,
  executeGmailCleanup,
  previewGmailCleanup,
  reopenAccount,
  updateAccount,
} from '@/actions/accounts';
import { Account, AccountRequest } from '@/lib/account.types';
import { optionalDecimal, optionalString } from '@/lib/forms';
import { AccountType, FinancialPosition } from '@/lib/types';
import { getAccountTypeLabel } from '@/lib/utils';

interface UseAccountFormOptions {
  account?: Account;
  onSuccess?: () => void;
  onClose?: () => void;
}

export function useAccountForm({ account, onSuccess, onClose }: UseAccountFormOptions) {
  const isUpdateMode = !!account;
  const [accountType, setAccountType] = useState<AccountType>(
    account?.type || AccountType.BANK_ACCOUNT
  );
  const [excludeFromNetAsset, setExcludeFromNetAsset] = useState<boolean>(
    account?.excludeFromNetAsset || false
  );
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [confirmCleanup, setConfirmCleanup] = useState<{
    count: number;
    before: string;
    accountData: AccountRequest;
  } | null>(null);

  const [isClosingAccount, setIsClosingAccount] = useState(false);
  const [isReopeningAccount, setIsReopeningAccount] = useState(false);
  const [closeOnDate, setCloseOnDate] = useState(new Date().toISOString().split('T')[0]);
  const [showCloseInline, setShowCloseInline] = useState(false);

  useEffect(() => {
    if (account?.type) {
      setAccountType(account.type);
    }
    if (account) {
      setExcludeFromNetAsset(account.excludeFromNetAsset || false);
    }
  }, [account]);

  const defaultIngestFromDate = account
    ? account.ingestFromDate
      ? account.ingestFromDate.split('T')[0]
      : ''
    : undefined;

  const handleCloseAccount = async () => {
    if (!account) return;
    setIsClosingAccount(true);
    try {
      const res = await closeAccount(account.id, { closedOn: closeOnDate || undefined });
      if (res.success) {
        if (res.data?.warnings && res.data.warnings.length > 0) {
          toast.warning(res.data.warnings.join('; '));
        } else {
          toast.success('Account closed successfully');
        }
        setShowDeleteConfirm(false);
        onSuccess?.();
        onClose?.();
      } else {
        toast.error(res.error.message);
      }
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsClosingAccount(false);
    }
  };

  const handleReopenAccount = async () => {
    if (!account) return;
    setIsReopeningAccount(true);
    try {
      const res = await reopenAccount(account.id);
      if (res.success) {
        toast.success('Account reopened successfully');
        onSuccess?.();
        onClose?.();
      } else {
        toast.error(res.error.message);
      }
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsReopeningAccount(false);
    }
  };

  const handleDelete = async () => {
    if (!account) return;
    setIsDeleting(true);
    try {
      const res = await deleteAccount(account.id);
      if (res.success) {
        toast.success('Account deleted!');
        setShowDeleteConfirm(false);
        onSuccess?.();
        onClose?.();
      } else {
        toast.error(res.error.message);
      }
    } catch (error) {
      toast.error((error as Error).message);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
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
        setIsSubmitting(false);
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
        setIsSubmitting(false);
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
      setIsSubmitting(false);
      return;
    }

    if (
      isUpdateMode &&
      account &&
      account.ingestFromDate &&
      ingestFromDate &&
      ingestFromDate > account.ingestFromDate.split('T')[0]
    ) {
      const previewRes = await previewGmailCleanup(account.id, ingestFromDate);
      if (previewRes.success && previewRes.data.count > 0) {
        setConfirmCleanup({
          count: previewRes.data.count,
          before: ingestFromDate,
          accountData: data,
        });
        setIsSubmitting(false);
        return;
      }
    }

    try {
      const res =
        isUpdateMode && account
          ? await updateAccount(account.id, data)
          : await createAccount(data);
      if (res.success) {
        toast.success(
          isUpdateMode ? 'Account updated successfully!' : 'Account created successfully!'
        );
        onSuccess?.();
      } else {
        toast.error(res.error.message);
      }
    } catch (err) {
      toast.error('An error occurred: ' + (err as Error).message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleConfirmCleanup = async () => {
    if (!confirmCleanup || !account) return;
    setIsSubmitting(true);
    try {
      const cleanupRes = await executeGmailCleanup(account.id, confirmCleanup.before);
      if (!cleanupRes.success) {
        toast.error(cleanupRes.error.message);
        setIsSubmitting(false);
        return;
      }
      const res = await updateAccount(account.id, confirmCleanup.accountData);
      if (res.success) {
        toast.success('Account updated and transactions cleaned up successfully!');
        setConfirmCleanup(null);
        onSuccess?.();
      } else {
        toast.error(res.error.message);
      }
    } catch (err) {
      toast.error('An error occurred: ' + (err as Error).message);
    } finally {
      setIsSubmitting(false);
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

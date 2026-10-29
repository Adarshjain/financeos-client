'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

import { Dialog, showToast } from '@/components/ds';
import { useAccountDialogs } from '@/features/accounts/form/ds/AccountDialogs';
import type { Account } from '@/lib/account.types';
import { resolveAmountExpression } from '@/lib/amountExpression';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { useAccounts } from '@/lib/query/hooks/useAccounts';
import { useCategories } from '@/lib/query/hooks/useCategories';
import type { Transaction } from '@/lib/transaction.types';
import { AccountType } from '@/lib/types';

import { mergeOntoLatest, patchChange, patchFromValues } from '../optimistic/optimisticModel';
import { useOptimisticTransactions } from '../optimistic/OptimisticTransactions';
import {
  getCardOptions,
  getDefaultCardIdForAccount,
  getSelectableAccounts,
} from './transactionCrudModel';
import { TransactionFormFields } from './TransactionFormFields';
import {
  buildRequest,
  emptyValues,
  type FormErrors,
  formProblems,
  NO_CARD,
  REASONS_REQUIRED,
  reasonsMissing,
  type TransactionFormValues,
  valuesFromTransaction,
} from './transactionFormModel';
import { useCategorySuggestions } from './useCategorySuggestions';
import { useTransactionMutations } from './useTransactionMutations';

const FORM_ID = 'transaction-form';
const NO_CATEGORIES: never[] = [];

export interface TransactionFormDialogProps {
  /** Edit this transaction; without it the dialog adds one. */
  transaction?: Transaction;
  /** Add: the account to start on (the list's one account filter). */
  defaultAccountId?: string;
  /** Today, YYYY-MM-DD, in the app's zone. */
  today: string;
  /** The accounts the page already loaded; the dialog keeps them current. */
  accounts: Account[] | null;
  /** Cancelled, or saved. */
  onClose: () => void;
}

/** Add transaction and Edit transaction: one form. Saving refreshes the page behind it. */
export function TransactionFormDialog({
  transaction,
  defaultAccountId = '',
  today,
  accounts: initialAccounts,
  onClose,
}: TransactionFormDialogProps) {
  const router = useRouter();
  const accountDialogs = useAccountDialogs();
  const isUpdate = Boolean(transaction);
  const { data: accounts = [] } = useAccounts(initialAccounts ?? undefined);
  const { data: allCategories = NO_CATEGORIES } = useCategories();
  const { createMutation, updateMutation } = useTransactionMutations();
  const optimistic = useOptimisticTransactions();

  const [values, setValues] = React.useState<TransactionFormValues>(() => {
    if (transaction) return valuesFromTransaction(transaction);
    // Start on the filtered account only when a transaction can be recorded against it, with its default card.
    const start = getSelectableAccounts(accounts, undefined, today).find((a) => a.id === defaultAccountId);
    return {
      ...emptyValues(today, start?.id ?? ''),
      cardId: getDefaultCardIdForAccount(start) ?? NO_CARD,
    };
  });
  const [errors, setErrors] = React.useState<FormErrors>({});
  // The accounts may still be loading when Add opens from somewhere that does not have them (search, the shell):
  // start on the wanted account once they arrive, unless one was picked meanwhile.
  const [defaultPending, setDefaultPending] = React.useState(!transaction && defaultAccountId !== '' && values.accountId === '');
  if (defaultPending) {
    const start = getSelectableAccounts(accounts, undefined, today).find((a) => a.id === defaultAccountId);
    if (start) {
      setDefaultPending(false);
      setValues((v) =>
        v.accountId === '' ? { ...v, accountId: start.id, cardId: getDefaultCardIdForAccount(start) ?? NO_CARD } : v,
      );
    }
  }

  const {
    localCategories,
    selectedCategories,
    setSelectedCategories,
    creatingCategory,
    suggestingCategories,
    createCategory,
    handleDescriptionBlur,
  } = useCategorySuggestions({
    categories: allCategories,
    initialSelectedCategories: transaction?.categories ?? [],
    isUpdateMode: isUpdate,
    onMccSuggested: (suggested) => setValues((v) => (v.mcc ? v : { ...v, mcc: suggested })),
  });

  const selectableAccounts = getSelectableAccounts(accounts, transaction, today);
  const selectedAccount = accounts.find((a) => a.id === values.accountId);
  const supportsCards =
    selectedAccount?.type === AccountType.CREDIT_CARD || selectedAccount?.type === AccountType.BANK_ACCOUNT;
  const cardOptions = getCardOptions(selectedAccount, selectedAccount?.type === AccountType.BANK_ACCOUNT, transaction, today);

  const change = (patch: Partial<TransactionFormValues>) => {
    setValues((v) => ({ ...v, ...patch }));
    setErrors((e) => {
      const next = { ...e };
      for (const key of Object.keys(patch)) delete next[key as keyof FormErrors];
      return next;
    });
  };

  const pickAccount = (accountId: string) => {
    const account = accounts.find((a) => a.id === accountId);
    change({ accountId, cardId: getDefaultCardIdForAccount(account) ?? NO_CARD });
  };

  // "Add account" opens the Dinero dialog; an account that appears while it is open is the new one, so pick it.
  const [knownAccountIds, setKnownAccountIds] = React.useState<ReadonlySet<string> | null>(null);
  React.useEffect(() => {
    if (!knownAccountIds) return;
    const added = selectableAccounts.find((a) => !knownAccountIds.has(a.id));
    if (added) {
      setKnownAccountIds(null);
      pickAccount(added.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [knownAccountIds, accounts]);
  const addAccount = () => {
    setKnownAccountIds(new Set(accounts.map((a) => a.id)));
    // Stay on this page: the new account is picked below once the accounts list has it.
    accountDialogs.open(undefined, { onCreated: () => undefined });
  };

  const saving = createMutation.isPending || updateMutation.isPending;
  const reviewError = isUpdate && reasonsMissing(values, transaction) ? REASONS_REQUIRED : undefined;

  const submit = async () => {
    // Enter submits without a blur: settle any typed arithmetic (120+45) first.
    const current: TransactionFormValues = {
      ...values,
      amount: resolveAmountExpression(values.amount),
      instantDiscount: resolveAmountExpression(values.instantDiscount),
      convenienceFee: resolveAmountExpression(values.convenienceFee),
    };
    setValues(current);
    const found = formProblems(current, { isUpdate, original: transaction, selectableAccounts });
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    try {
      const body = buildRequest(current, {
        isUpdate,
        source: transaction?.source,
        categoryIds: selectedCategories.map((c) => c.id),
        supportsCards,
      });
      if (transaction && optimistic) {
        // Edit: the row and the detail show the new values now and the dialog closes; the save finishes behind it.
        const shown = optimistic.begin(
          patchChange(transaction.id, patchFromValues(current, selectedCategories.map((c) => ({ id: c.id, name: c.name })), transaction, supportsCards)),
        );
        onClose();
        try {
          // Sent behind any earlier write to this row: what the person changed, on the row as the server then holds it.
          await shown.send(() => {
            const latest = shown.base(transaction.id) ?? transaction;
            const chosen = selectedCategories.map((c) => c.id).join();
            const opened = (transaction.categories ?? []).map((c) => c.id).join();
            return updateMutation.mutateAsync({
              id: transaction.id,
              body: buildRequest(mergeOntoLatest(current, transaction, latest), {
                isUpdate,
                source: transaction.source,
                categoryIds: chosen === opened ? (latest.categories ?? []).map((c) => c.id) : selectedCategories.map((c) => c.id),
                supportsCards,
              }),
            });
          });
          shown.settle(true);
          showToast('Transaction saved');
          router.refresh();
        } catch (e) {
          shown.settle(false);
          showToast(getErrorMessage(e, "Couldn't save the transaction. Try again."), { tone: 'danger' });
        }
        return;
      }
      if (transaction) await updateMutation.mutateAsync({ id: transaction.id, body });
      else await createMutation.mutateAsync(body);
      showToast('Transaction saved');
      onClose();
      router.refresh();
    } catch (e) {
      showToast(getErrorMessage(e, "Couldn't save the transaction. Try again."), { tone: 'danger' });
    }
  };

  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <Dialog.Content
        size="md"
        title={isUpdate ? 'Edit transaction' : 'Add transaction'}
        secondary={{ label: 'Cancel', onSelect: onClose, disabled: saving }}
        primary={{ label: isUpdate ? 'Save transaction' : 'Add transaction', type: 'submit', form: FORM_ID, loading: saving }}
      >
        <Dialog.Body>
          <form
            id={FORM_ID}
            noValidate
            autoComplete="off"
            className="flex flex-col gap-space-8 desk:gap-space-12"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <TransactionFormFields
              values={values}
              errors={errors}
              isUpdate={isUpdate}
              today={today}
              accounts={selectableAccounts}
              hasAccounts={selectableAccounts.length > 0}
              cardOptions={supportsCards ? cardOptions : []}
              categories={localCategories}
              selectedCategoryIds={selectedCategories.map((c) => c.id)}
              creatingCategory={creatingCategory}
              suggestingCategories={suggestingCategories}
              sourcedDescription={transaction?.sourcedDescription}
              reviewError={reviewError}
              onChange={change}
              onAccountChange={pickAccount}
              onCategoriesChange={(ids) =>
                setSelectedCategories(ids.map((id) => localCategories.find((c) => c.id === id)).filter((c) => c !== undefined))
              }
              onCreateCategory={(name) => void createCategory(name)}
              onDescriptionBlur={handleDescriptionBlur}
              onAddAccount={addAccount}
            />
          </form>
        </Dialog.Body>
      </Dialog.Content>
    </Dialog>
  );
}

'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

import { Dialog } from '@/components/ds/Dialog/Dialog';
import type { IconName } from '@/components/ds/Icon/registry';
import { showToast } from '@/components/ds/Toast/Toast';
import { CategoryPicker } from '@/components/organisms/CategoryPicker/CategoryPicker';
import { TagSheet } from '@/components/organisms/TagSheet/TagSheet';
import { useAccountDialogs } from '@/features/accounts/form/ds/AccountDialogs';
import { useDiscardGuard } from '@/features/shell/useDiscardGuard';
import type { Account } from '@/lib/account.types';
import { resolveAmountExpression } from '@/lib/amountExpression';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { categoryLabel, findCategory, findSub } from '@/lib/categoryList';
import type { CategoryDef, CategoryPick } from '@/lib/categoryList.types';
import { formatMoney } from '@/lib/format';
import { useAccounts } from '@/lib/query/hooks/useAccounts';
import { useCategoryList } from '@/lib/query/hooks/useCategoryList';
import { useCategoryRecent } from '@/lib/query/hooks/useCategoryRecent';
import { useTags } from '@/lib/query/hooks/useTags';
import type { Transaction } from '@/lib/transaction.types';
import { AccountType } from '@/lib/types';

import { categoryPatch, pickOf } from '../category/categoryModel';
import { mergeOntoLatest, patchChange, patchFromValues } from '../optimistic/optimisticModel';
import { useOptimisticTransactions } from '../optimistic/OptimisticTransactions';
import { useTagMutations } from '../tags/useTagMutations';
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
import { useCategorySuggestion } from './useCategorySuggestion';
import { useTagSelection } from './useTagSelection';
import { useTransactionMutations } from './useTransactionMutations';

const FORM_ID = 'transaction-form';
const NO_TAGS: never[] = [];
const samePick = (a: CategoryPick | null, b: CategoryPick | null) => a?.categoryKey === b?.categoryKey && (a?.subcategoryKey ?? null) === (b?.subcategoryKey ?? null);

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
  const { data: allTags = NO_TAGS } = useTags();
  const { list: categoryList } = useCategoryList();
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
  const [touched, setTouched] = React.useState(false);
  const guard = useDiscardGuard({ dirty: touched, onClose });
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

  const { localTags, selectedTags, setSelectedTags, creatingTag, createTag } = useTagSelection({
    tags: allTags,
    initialSelectedTags: transaction?.tags ?? [],
  });
  // The category on the form. Edit starts on the stored one and sends it only once the user changes it.
  const opened = React.useMemo(() => (transaction ? pickOf(transaction) : null), [transaction]);
  const [category, setCategory] = React.useState<CategoryPick | null>(opened);
  const [pickingCategory, setPickingCategory] = React.useState(false);
  const recentCategories = useCategoryRecent(values.direction === 'credit' ? 'IN' : 'OUT', pickingCategory);
  const [pickingTags, setPickingTags] = React.useState(false);
  // A tag deleted in the sheet's Manage leaves the form's choice too.
  const tagMutations = useTagMutations({ onDeleted: (tag) => setSelectedTags((now) => now.filter((c) => c.id !== tag.id)) });
  const categoryChanged = !samePick(category, opened);
  const pickedCategory = (pick: CategoryPick) => {
    setTouched(true);
    setCategory(pick);
  };
  // Add: a suggestion fills the field while nothing is picked; the user can accept it or open the picker.
  const { suggesting, onDescriptionBlur } = useCategorySuggestion(
    (pick) => setCategory((now) => now ?? pick),
    !isUpdate,
  );

  const selectableAccounts = getSelectableAccounts(accounts, transaction, today);
  const selectedAccount = accounts.find((a) => a.id === values.accountId);
  const supportsCards =
    selectedAccount?.type === AccountType.CREDIT_CARD || selectedAccount?.type === AccountType.BANK_ACCOUNT;
  const cardOptions = getCardOptions(selectedAccount, selectedAccount?.type === AccountType.BANK_ACCOUNT, transaction, today);

  const change = (patch: Partial<TransactionFormValues>) => {
    setTouched(true);
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

  const categoryDef = findCategory(categoryList, category?.categoryKey);
  const categoryText = categoryDef ? categoryLabel(categoryDef.name, findSub(categoryDef, category?.subcategoryKey)?.name) : '';
  const amountValue = Math.abs(Number(values.amount));
  const pickerSubtitle = [values.description.trim(), Number.isFinite(amountValue) && amountValue > 0 ? formatMoney(amountValue, { decimals: 'exact' }) : '']
    .filter(Boolean)
    .join(' · ') || undefined;

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
        tagIds: selectedTags.map((c) => c.id),
        category: categoryChanged ? category : null,
        supportsCards,
      });
      if (transaction && optimistic) {
        // Edit: the row and the detail show the new values now and the dialog closes; the save finishes behind it.
        const shown = optimistic.begin(
          patchChange(transaction.id, {
            ...patchFromValues(current, selectedTags, transaction, supportsCards),
            ...(categoryChanged ? categoryPatch(categoryList, category, 'USER', new Date().toISOString()) : {}),
          }),
        );
        onClose();
        try {
          // Sent behind any earlier write to this row: what the person changed, on the row as the server then holds it.
          await shown.send(() => {
            const latest = shown.base(transaction.id) ?? transaction;
            const openedTags = (transaction.tags ?? []).map((c) => c.id).join();
            const chosenTags = selectedTags.map((c) => c.id).join();
            return updateMutation.mutateAsync({
              id: transaction.id,
              body: buildRequest(mergeOntoLatest(current, transaction, latest), {
                isUpdate,
                source: transaction.source,
                tagIds: chosenTags === openedTags ? (latest.tags ?? []).map((c) => c.id) : selectedTags.map((c) => c.id),
                category: categoryChanged ? category : null,
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
    <>
    <Dialog open onOpenChange={(open) => (open ? undefined : guard.requestClose())}>
      <Dialog.Content
        size="md"
        title={isUpdate ? 'Edit transaction' : 'Add transaction'}
        secondary={{ label: 'Cancel', onSelect: guard.requestClose, disabled: saving }}
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
              tagsLabel={selectedTags.length > 0 ? selectedTags.map((c) => localTags.find((x) => x.id === c.id)?.name ?? c.name).join(', ') : undefined}
              categoryLabel={categoryText || undefined}
              categoryIcon={categoryDef?.icon as IconName | undefined}
              suggestingCategory={suggesting}
              sourcedDescription={transaction?.sourcedDescription}
              reviewError={reviewError}
              onChange={change}
              onAccountChange={pickAccount}
              onOpenCategory={() => setPickingCategory(true)}
              onOpenTags={() => setPickingTags(true)}
              onDescriptionBlur={onDescriptionBlur}
              onAddAccount={addAccount}
            />
          </form>
        </Dialog.Body>
      </Dialog.Content>
    </Dialog>
    <TagSheet
      open={pickingTags}
      onOpenChange={setPickingTags}
      tags={localTags}
      value={selectedTags.map((c) => c.id)}
      onValueChange={(ids) => {
        setTouched(true);
        setSelectedTags(ids.map((id) => localTags.find((c) => c.id === id)).filter((c) => c !== undefined));
      }}
      subtitle={values.description.trim() || undefined}
      onCreate={(name) => {
        setTouched(true);
        void createTag(name);
      }}
      creating={creatingTag}
      onRename={(tag, name) => tagMutations.rename.mutate({ tag, name })}
      onDelete={(tag) => tagMutations.remove.mutate(tag)}
      managing={tagMutations.rename.isPending || tagMutations.remove.isPending}
    />
    <CategoryPicker
      open={pickingCategory}
      onOpenChange={setPickingCategory}
      categories={categoryList as CategoryDef[]}
      direction={values.direction === 'credit' ? 'IN' : 'OUT'}
      recent={recentCategories}
      value={category}
      subtitle={pickerSubtitle}
      onPick={pickedCategory}
    />
    {guard.node}
    </>
  );
}

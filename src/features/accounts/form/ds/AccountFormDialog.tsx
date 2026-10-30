'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

import { Banner } from '@/components/ds/Banner/Banner';
import { ConfirmDialog, Dialog } from '@/components/ds/Dialog/Dialog';
import { SegmentedControl } from '@/components/ds/SegmentedControl/SegmentedControl';
import { type SelectOption } from '@/components/ds/Select/Select';
import { Text } from '@/components/ds/Text/Text';
import { showToast } from '@/components/ds/Toast/Toast';
import { useAccountFormMutations } from '@/features/accounts/form/useAccountFormMutations';
import { useAccountIdentifiers } from '@/features/accounts/form/useAccountIdentifiers';
import { appHref } from '@/features/shell/routes';
import type { Account, AccountRequest } from '@/lib/account.types';
import { resolveAmountExpression } from '@/lib/amountExpression';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { distinctLimitPools } from '@/lib/creditLimitPools';
import { todayInAppZone } from '@/lib/date-range';
import { formatDate } from '@/lib/format';
import { useAccounts } from '@/lib/query/hooks/useAccounts';
import { AccountType } from '@/lib/types';

import { AccountFormFields } from './AccountFormFields';
import {
  ACCOUNT_TYPE_OPTIONS,
  type AccountFormValues,
  accountTypeLabel,
  addIdentifier,
  buildAccountRequest,
  defaultFinancialPosition,
  diffIdentifiers,
  emptyValues,
  fieldsFor,
  type FormErrors,
  identifiersFailedMessage,
  movesIngestLater,
  otherPoolMembers,
  validateAccountForm,
  valuesFromAccount,
  withLimitPoolChoice,
} from './accountFormModel';
import { CloseAccountSection, DeleteAccountSection } from './AccountLifecycleSections';

const ACCOUNTS_HREF = appHref('/accounts');
const FORM_ID = 'account-form';

interface Cleanup {
  count: number;
  before: string;
  request: AccountRequest;
}

export interface AccountFormDialogProps {
  /** Edit this account; without it the dialog adds one. */
  account?: Account;
  /** Add mode: the type picked from the link ("credit_card"); null shows the picker with nothing picked. */
  initialType?: AccountType | null;
  /** The dialog was cancelled or the account was saved, closed or reopened. */
  onClose: () => void;
  /** Add mode: called with the new account instead of opening its page; the dialog closes and the page stays put. */
  onCreated?: (account: Account) => void;
}

/** Add account and Edit account: one dialog, the fields follow the picked type. */
export function AccountFormDialog({ account, initialType = null, onClose, onCreated }: AccountFormDialogProps) {
  const router = useRouter();
  const isEdit = Boolean(account);
  const today = todayInAppZone();
  const mutations = useAccountFormMutations();
  const idApi = useAccountIdentifiers(account?.id);

  const [values, setValues] = React.useState<AccountFormValues>(() =>
    account ? valuesFromAccount(account) : emptyValues(initialType)
  );
  const [errors, setErrors] = React.useState<FormErrors>({});
  const [identifierError, setIdentifierError] = React.useState<string | null>(null);
  const [cleanup, setCleanup] = React.useState<Cleanup | null>(null);
  const [closeDate, setCloseDate] = React.useState('');
  const [showDelete, setShowDelete] = React.useState(false);
  const [failure, setFailure] = React.useState<string | null>(null);

  // Edit: the stored identifiers load after the dialog opens; adopt them once.
  const [identifiersSeeded, setIdentifiersSeeded] = React.useState(!isEdit);
  if (!identifiersSeeded && !idApi.isLoading) {
    setIdentifiersSeeded(true);
    setValues((v) => ({ ...v, identifiers: idApi.identifiers.map((i) => i.value) }));
  }

  const type = values.type;
  const isCard = type === AccountType.CREDIT_CARD;
  const { data: allAccounts } = useAccounts(undefined, { enabled: isCard });
  // The edited account goes first so its own pool is offered before the list loads.
  const pools = distinctLimitPools([...(account ? [account] : []), ...(allAccounts ?? [])]);
  const currentPoolId = account?.type === AccountType.CREDIT_CARD ? account.limitPool?.id : undefined;

  const saving =
    mutations.createAccountMutation.isPending ||
    mutations.updateAccountMutation.isPending ||
    mutations.previewGmailCleanupMutation.isPending ||
    mutations.executeGmailCleanupMutation.isPending;
  const busy = saving || mutations.closeAccountMutation.isPending || mutations.reopenAccountMutation.isPending;

  const change = (patch: Partial<AccountFormValues>) => {
    setValues((v) => ({ ...v, ...patch }));
    setErrors((e) => {
      const next = { ...e };
      for (const key of Object.keys(patch) as (keyof FormErrors)[]) delete next[key];
      return next;
    });
  };

  const pickType = (next: AccountType) => {
    setValues((v) => ({ ...v, type: next, financialPosition: defaultFinancialPosition(next), identifiers: [] }));
    setErrors({});
    setIdentifierError(null);
  };

  const identifierOptions: SelectOption[] = [
    ...new Set([...idApi.identifiers.map((i) => i.value), ...values.identifiers]),
  ].map((value) => ({ value, label: value }));

  const createIdentifier = (raw: string) => {
    setIdentifierError(null);
    const result = addIdentifier(values.identifiers, raw);
    if (!result.ok) {
      setIdentifierError(result.error);
      return;
    }
    setIdentifierError(null);
    change({ identifiers: result.list });
  };

  /** Identifiers are saved with the form: new accounts create them, edited ones apply the difference. */
  const saveIdentifierChanges = async (): Promise<string[]> => {
    const { add, remove } = diffIdentifiers(idApi.identifiers, values.identifiers);
    const failed: string[] = [];
    for (const value of add) {
      try {
        await idApi.createIdentifier({ value });
      } catch {
        failed.push(value);
      }
    }
    for (const stored of remove) {
      try {
        await idApi.deleteIdentifier(stored.id);
      } catch {
        failed.push(stored.value);
      }
    }
    return failed;
  };

  const finishUpdate = async (message: string) => {
    const failed = await saveIdentifierChanges();
    showToast(message);
    if (failed.length > 0) showToast(identifiersFailedMessage(failed, false), { tone: 'danger' });
    onClose();
    router.refresh();
  };

  const submit = async () => {
    // Enter submits without a blur: settle any typed arithmetic (120+45) first.
    const money = { allowNegative: true };
    const resolved: AccountFormValues = {
      ...values,
      openingBalance: resolveAmountExpression(values.openingBalance, money),
      cashBalance: resolveAmountExpression(values.cashBalance, money),
      limitPoolLimit: resolveAmountExpression(values.limitPoolLimit, money),
      creditLimit: resolveAmountExpression(values.creditLimit, money),
    };
    setValues(resolved);
    const found = validateAccountForm(resolved);
    setErrors(found);
    if (Object.keys(found).length > 0 || !values.type) return;
    setFailure(null);
    const request = buildAccountRequest(resolved);
    const identifiers = fieldsFor(values.type).includes('identifiers') ? values.identifiers : [];

    if (account && request.type !== AccountType.BROKER && request.type !== AccountType.GENERIC) {
      const before = request.ingestFromDate;
      if (before && movesIngestLater(account, before)) {
        try {
          const preview = await mutations.previewGmailCleanupMutation.mutateAsync({ accountId: account.id, before });
          if (preview.count > 0) {
            setCleanup({ count: preview.count, before, request });
            return;
          }
        } catch (e) {
          showToast(getErrorMessage(e, "Couldn't preview the Gmail cleanup. Try again."), { tone: 'danger' });
          return;
        }
      }
    }

    try {
      if (account) {
        await mutations.updateAccountMutation.mutateAsync({ id: account.id, body: request });
        await finishUpdate('Account updated');
      } else {
        const { account: created, failedIdentifiers } = await mutations.createAccountMutation.mutateAsync({
          body: request,
          identifiers,
        });
        showToast('Account created');
        if (failedIdentifiers.length > 0) {
          showToast(identifiersFailedMessage(failedIdentifiers, true), { tone: 'danger' });
        }
        if (onCreated) {
          onCreated(created);
          onClose();
        } else {
          router.push(`${ACCOUNTS_HREF}/${created.id}`);
        }
      }
    } catch (e) {
      setFailure(getErrorMessage(e, isEdit ? "Couldn't update the account. Try again." : "Couldn't add the account. Try again."));
    }
  };

  const confirmCleanup = async () => {
    if (!cleanup || !account) return;
    try {
      await mutations.executeGmailCleanupMutation.mutateAsync({ accountId: account.id, before: cleanup.before });
    } catch (e) {
      showToast(getErrorMessage(e, "Couldn't run the Gmail cleanup. Try again."), { tone: 'danger' });
      return;
    }
    try {
      await mutations.updateAccountMutation.mutateAsync({ id: account.id, body: cleanup.request });
      setCleanup(null);
      await finishUpdate('Account updated and transactions cleaned up');
    } catch (e) {
      setCleanup(null);
      setFailure(getErrorMessage(e, "Couldn't update the account. Try again."));
    }
  };

  const closeAccount = async () => {
    if (!account) return;
    try {
      const closed = await mutations.closeAccountMutation.mutateAsync({
        id: account.id,
        body: { closedOn: closeDate || undefined },
      });
      if (closed.warnings && closed.warnings.length > 0) {
        showToast(closed.warnings.join('; '), { tone: 'warning' });
      } else {
        showToast('Account closed');
      }
      onClose();
      router.refresh();
    } catch (e) {
      showToast(getErrorMessage(e, "Couldn't close the account. Try again."), { tone: 'danger' });
    }
  };

  const reopenAccount = async () => {
    if (!account) return;
    try {
      await mutations.reopenAccountMutation.mutateAsync(account.id);
      showToast('Account reopened');
      onClose();
      router.refresh();
    } catch (e) {
      showToast(getErrorMessage(e, "Couldn't reopen the account. Try again."), { tone: 'danger' });
    }
  };

  const deleteAccount = async () => {
    if (!account) return;
    try {
      await mutations.deleteAccountMutation.mutateAsync(account.id);
      showToast('Account deleted');
      setShowDelete(false);
      router.push(ACCOUNTS_HREF);
      router.refresh();
    } catch (e) {
      showToast(getErrorMessage(e, "Couldn't delete the account. Try again."), { tone: 'danger' });
    }
  };

  const noun = isCard ? 'card' : 'account';

  return (
    <>
      <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
        <Dialog.Content
          size="md"
          title={isEdit ? 'Edit account' : 'Add account'}
          description={account ? `${account.name} · ${accountTypeLabel(account.type)}` : undefined}
          secondary={{ label: 'Cancel', onSelect: onClose, disabled: busy }}
          primary={{
            label: isEdit ? 'Save account' : 'Add account',
            type: 'submit',
            form: FORM_ID,
            loading: saving,
            disabled: !type || busy,
          }}
        >
          <Dialog.Body>
            {failure ? <Banner tone="danger">{failure}</Banner> : null}
            <form
              id={FORM_ID}
              noValidate
              autoComplete="off"
              className="flex flex-col gap-space-8 desk:gap-space-16"
              onSubmit={(e) => {
                e.preventDefault();
                void submit();
              }}
            >
              {!isEdit ? (
                <SegmentedControl
                  fullWidth
                  aria-label="Account type"
                  options={ACCOUNT_TYPE_OPTIONS}
                  defaultValue={initialType ?? undefined}
                  onValueChange={pickType}
                />
              ) : null}
              <AccountFormFields
                values={values}
                errors={errors}
                isEdit={isEdit}
                today={today}
                pools={pools}
                poolOthers={otherPoolMembers(pools, values.limitPoolChoice, currentPoolId)}
                identifiersLoading={isEdit && !identifiersSeeded}
                identifierError={identifierError}
                identifierOptions={identifierOptions}
                onChange={change}
                onLimitPoolChoice={(choice) => setValues((v) => withLimitPoolChoice(v, choice, pools))}
                onCreateIdentifier={createIdentifier}
                onIdentifiersChange={(list) => {
                  setIdentifierError(null);
                  change({ identifiers: list });
                }}
              />
            </form>
            {account ? (
              <>
                <CloseAccountSection
                  closedOn={account.closedOn}
                  today={today}
                  closeDate={closeDate}
                  onCloseDateChange={setCloseDate}
                  closing={mutations.closeAccountMutation.isPending}
                  reopening={mutations.reopenAccountMutation.isPending}
                  disabled={busy}
                  onClose={closeAccount}
                  onReopen={reopenAccount}
                  noun={noun}
                />
                <DeleteAccountSection disabled={busy} onDelete={() => setShowDelete(true)} />
              </>
            ) : null}
          </Dialog.Body>
        </Dialog.Content>
      </Dialog>

      {account ? (
        <ConfirmDialog
          open={showDelete}
          onOpenChange={setShowDelete}
          title={`Delete ${account.name}?`}
          description="Deletes the account with all its transactions, statements, cards, reward rules and Gmail history. This can't be undone."
          confirmLabel="Delete"
          confirmLoading={mutations.deleteAccountMutation.isPending}
          onConfirm={deleteAccount}
        >
          {account.closedOn ? null : (
            <Banner tone="warning" title="Not using this account any more?">
              Close it instead. Closing keeps all its history. Close account is just above Delete account in this form.
            </Banner>
          )}
        </ConfirmDialog>
      ) : null}

      <ConfirmDialog
        open={cleanup !== null}
        onOpenChange={(open) => (open ? undefined : setCleanup(null))}
        title="Delete earlier Gmail transactions?"
        description={cleanup ? `You moved "Import emails from" to ${formatDate(cleanup.before, 'input')}.` : undefined}
        confirmLabel="Delete & save"
        confirmLoading={saving}
        onConfirm={confirmCleanup}
      >
        {cleanup ? (
          <Text variant="body" tone="ink-2" as="p">
            Delete {cleanup.count} Gmail-imported transactions before {formatDate(cleanup.before, 'input')}? Statement imports are
            not affected.
          </Text>
        ) : null}
      </ConfirmDialog>
    </>
  );
}

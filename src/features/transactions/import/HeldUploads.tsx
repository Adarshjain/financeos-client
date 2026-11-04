'use client';

import React from 'react';

import { Button } from '@/components/ds/Button/Button';
import { Card } from '@/components/ds/Card/Card';
import { ConfirmDialog } from '@/components/ds/Dialog/Dialog';
import { ListRow } from '@/components/ds/ListRow/ListRow';
import { Text } from '@/components/ds/Text/Text';
import { TextField } from '@/components/ds/TextField/TextField';
import { showToast } from '@/components/ds/Toast/Toast';
import { AccountPicker } from '@/components/organisms/AccountPicker/AccountPicker';
import { loadAccountForm } from '@/features/accounts/form/ds/AccountDialogs';
import type { Account } from '@/lib/account.types';
import { ActionError } from '@/lib/actionResult';
import { getErrorMessage } from '@/lib/api/errorMessage';
import type { HeldUpload } from '@/lib/api/types';
import { useLazyDialog } from '@/lib/lazy/useLazyDialog';
import { AccountType } from '@/lib/types';

import { heldCaption, isPasswordCode } from './heldModel';
import { useHeldUploads } from './useHeldUploads';

const IMPORT_ACCOUNT_TYPES: readonly AccountType[] = [AccountType.BANK_ACCOUNT, AccountType.CREDIT_CARD];

export interface HeldUploadsProps {
  /** Accounts that can take statements. */
  accounts: Account[];
  initialHeld?: HeldUpload[];
  /** From `?held=`: the file to scroll to and highlight. */
  heldId?: string;
}

/** "Needs an account": statement files the server could not place; pick, create or remove. */
export function HeldUploads({ accounts, initialHeld, heldId }: HeldUploadsProps) {
  const { held, assign, remove } = useHeldUploads(initialHeld);
  const [removing, setRemoving] = React.useState<HeldUpload | null>(null);
  const [removePending, setRemovePending] = React.useState(false);
  const [creatingFor, setCreatingFor] = React.useState<HeldUpload | null>(null);
  const { Component: AccountFormDialog, run, loading: loadingForm } = useLazyDialog(loadAccountForm);

  if (held.length === 0) return null;

  const confirmRemove = async () => {
    if (!removing) return;
    setRemovePending(true);
    try {
      await remove(removing.id);
      showToast('File removed');
      setRemoving(null);
    } catch (e) {
      showToast(getErrorMessage(e, "Couldn't remove the file. Try again."), { tone: 'danger' });
    } finally {
      setRemovePending(false);
    }
  };

  return (
    <>
      <Card title="Needs an account" subtitle="We couldn't tell which account these statements belong to" data-testid="held-uploads">
        {held.map((h) => (
          <HeldRow
            key={h.id}
            held={h}
            accounts={accounts}
            highlighted={h.id === heldId}
            loadingForm={loadingForm}
            assign={assign}
            onCreate={() => void run(() => setCreatingFor(h))}
            onRemove={() => setRemoving(h)}
          />
        ))}
      </Card>
      <ConfirmDialog
        open={removing !== null}
        onOpenChange={(open) => {
          if (!open && !removePending) setRemoving(null);
        }}
        title="Remove this file?"
        description={`Removes ${removing?.fileName ?? 'the file'} from Needs an account. Nothing is imported; upload it again to import it later.`}
        confirmLabel="Remove"
        confirmLoading={removePending}
        onConfirm={() => void confirmRemove()}
      />
      {creatingFor && AccountFormDialog ? (
        <AccountFormDialog
          prefillBank={creatingFor.detectedBankId ?? undefined}
          prefillLast4={creatingFor.detectedLast4 ?? undefined}
          onCreated={(account) => {
            const target = creatingFor;
            void assign(target.id, account.id)
              .then((r) =>
                r.ok
                  ? showToast(`Imported ${r.filename ?? target.fileName}`)
                  : showToast(r.message || "Couldn't import the file. Try again.", { tone: 'danger' }),
              )
              .catch((e: unknown) =>
                showToast(getErrorMessage(e, "Couldn't import the file. Try again."), { tone: 'danger' }),
              );
          }}
          onClose={() => setCreatingFor(null)}
        />
      ) : null}
    </>
  );
}

interface HeldRowProps {
  held: HeldUpload;
  accounts: Account[];
  highlighted: boolean;
  loadingForm: boolean;
  assign: ReturnType<typeof useHeldUploads>['assign'];
  onCreate: () => void;
  onRemove: () => void;
}

function HeldRow({ held, accounts, highlighted, loadingForm, assign, onCreate, onRemove }: HeldRowProps) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [accountId, setAccountId] = React.useState<string | null>(null);
  const [password, setPassword] = React.useState<string | null>(null); // null: no password asked for yet
  const [passwordError, setPasswordError] = React.useState<string | undefined>();
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    if (highlighted) ref.current?.scrollIntoView?.({ block: 'center' });
  }, [highlighted]);

  const submit = async () => {
    if (!accountId) return;
    setPending(true);
    try {
      const r = await assign(held.id, accountId, password ?? undefined);
      if (r.ok) showToast(`Imported ${r.filename ?? held.fileName}`);
      else showToast(r.message || "Couldn't import the file. Try again.", { tone: 'danger' });
    } catch (e) {
      if (e instanceof ActionError && e.status === 422 && isPasswordCode(e.code)) {
        setPasswordError(e.code === 'WRONG_PASSWORD' ? "That password didn't work." : undefined);
        setPassword((p) => p ?? '');
      } else {
        showToast(getErrorMessage(e, "Couldn't import the file. Try again."), { tone: 'danger' });
      }
    } finally {
      setPending(false);
    }
  };

  return (
    <div ref={ref} data-testid="held-file" data-held-id={held.id}>
      <ListRow wrap highlighted={highlighted} title={held.fileName} subtitle={heldCaption(held)} />
      <form
        className="flex flex-col gap-space-8 px-space-16 pb-space-16"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <AccountPicker
          label="Account"
          placeholder="Choose an account…"
          accounts={accounts}
          types={IMPORT_ACCOUNT_TYPES}
          value={accountId}
          onValueChange={setAccountId}
          disabled={pending}
        />
        {password !== null ? (
          <TextField
            type="password"
            label="Statement password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setPasswordError(undefined);
            }}
            error={passwordError}
            disabled={pending}
          />
        ) : null}
        <div className="flex flex-wrap items-center gap-space-8">
          <Button type="submit" size="sm" loading={pending} disabled={!accountId || (password !== null && !password)}>
            Import
          </Button>
          <Button type="button" variant="secondary" size="sm" disabled={pending || loadingForm} onClick={onCreate}>
            Create account
          </Button>
          <Button type="button" variant="danger-ghost" size="sm" disabled={pending} onClick={onRemove}>
            Remove
          </Button>
        </div>
        {password !== null && !passwordError ? (
          <Text variant="caption" tone="ink-3" as="p">
            This statement is protected. Enter its password to import it.
          </Text>
        ) : null}
      </form>
    </div>
  );
}

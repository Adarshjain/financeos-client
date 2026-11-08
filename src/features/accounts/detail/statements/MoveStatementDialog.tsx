'use client';

import { useQueryClient } from '@tanstack/react-query';
import React from 'react';

import { Dialog } from '@/components/ds/Dialog/Dialog';
import { Text } from '@/components/ds/Text/Text';
import { showToast } from '@/components/ds/Toast/Toast';
import { AccountPicker } from '@/components/organisms/AccountPicker/AccountPicker';
import { isAccountClosed, supportsIngestion } from '@/lib/account.types';
import { unwrapAction } from '@/lib/actionResult';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { useAccounts } from '@/lib/query';
import { invalidateMoneyQueries } from '@/lib/query/invalidate';
import { keys } from '@/lib/query/keys';
import { AccountType } from '@/lib/types';
import { useAppRouter } from '@/lib/useAppRouter';

import { accountHref } from '../accountTabsModel';
import { moveStatement } from './moveStatementAction';

const FORM_ID = 'move-statement-form';
const MOVE_ACCOUNT_TYPES: readonly AccountType[] = [AccountType.BANK_ACCOUNT, AccountType.CREDIT_CARD];

export interface MoveStatementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
  statementId: string;
  /** "5 Oct 2026". */
  periodEndLabel: string;
  fy: string;
}

/** Moves a statement and its transactions to another account of the same type, keeping every edit. */
export function MoveStatementDialog({ open, onOpenChange, accountId, statementId, periodEndLabel, fy }: MoveStatementDialogProps) {
  const router = useAppRouter();
  const qc = useQueryClient();
  const { data: accounts = [], isLoading } = useAccounts();
  const [targetId, setTargetId] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  React.useEffect(() => {
    if (open) setTargetId(null);
  }, [open]);

  const sourceType = accounts.find((a) => a.id === accountId)?.type;
  // Same type only: the server refuses a card statement on a bank account and the other way round.
  const targets = accounts.filter(
    (a) => a.id !== accountId && a.type === sourceType && supportsIngestion(a.type) && !isAccountClosed(a),
  );

  const submit = async () => {
    if (!targetId || pending) return;
    const target = targets.find((a) => a.id === targetId);
    setPending(true);
    try {
      await unwrapAction(moveStatement(accountId, statementId, targetId));
      showToast(`Moved to ${target?.name ?? 'the other account'}`);
      onOpenChange(false);
      router.replace(`${accountHref(accountId)}/statements?fy=${fy}`);
      router.refresh();
      qc.removeQueries({ queryKey: keys.statements.detail(statementId) });
      void Promise.all([
        qc.invalidateQueries({ queryKey: keys.statements.all }),
        qc.invalidateQueries({ queryKey: keys.transactions.all }),
        qc.invalidateQueries({ queryKey: keys.bills.all }),
        invalidateMoneyQueries(qc),
      ]);
    } catch (e) {
      showToast(getErrorMessage(e, "Couldn't move the statement. Try again."), { tone: 'danger' });
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => (pending ? undefined : onOpenChange(next))}>
      <Dialog.Content
        size="sm"
        title="Move to another account"
        description={`The ${periodEndLabel} statement and its transactions.`}
        secondary={{ label: 'Cancel', onSelect: () => onOpenChange(false), disabled: pending }}
        primary={{ label: 'Move', type: 'submit', form: FORM_ID, loading: pending, disabled: !targetId }}
      >
        <Dialog.Body>
          <Text variant="body" tone="ink-2" as="p" className="mb-space-8">
            Its transactions move with it and keep your changes.
          </Text>
          <form
            id={FORM_ID}
            className="flex flex-col gap-space-8 desk:gap-space-12"
            onSubmit={(e) => {
              e.preventDefault();
              void submit();
            }}
          >
            <AccountPicker
              label="Account"
              placeholder={isLoading ? 'Loading accounts…' : 'Choose an account…'}
              accounts={targets}
              types={MOVE_ACCOUNT_TYPES}
              value={targetId}
              onValueChange={setTargetId}
              disabled={isLoading || pending}
            />
          </form>
        </Dialog.Body>
      </Dialog.Content>
    </Dialog>
  );
}

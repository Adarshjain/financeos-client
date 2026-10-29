'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

import { Banner, ConfirmDialog, showToast, Text } from '@/components/ds';
import { useDeleteStatement } from '@/features/accounts/statements/useStatementMutations';
import { IrreversibleNote } from '@/features/shell/IrreversibleNote';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { formatCount } from '@/lib/format';

import { accountHref } from '../accountTabsModel';
import { deletionImpact, deletionNote } from './detailModel';

export interface DeleteStatementDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  accountId: string;
  statementId: string;
  /** "5 Oct 2026". */
  periodEndLabel: string;
  source: 'gmail' | 'file_upload';
  fy: string;
}

/** Confirms deleting a statement after the server says what that removes and what stays. */
export function DeleteStatementDialog({
  open,
  onOpenChange,
  accountId,
  statementId,
  periodEndLabel,
  source,
  fy,
}: DeleteStatementDialogProps) {
  const router = useRouter();
  const { preview, remove, refreshAfterDelete } = useDeleteStatement(accountId, statementId, open);

  const confirm = async () => {
    try {
      const result = await remove.mutateAsync();
      showToast(
        `Statement deleted, ${formatCount(result.transactionsDeleted, ['transaction', 'transactions'])} removed`
      );
      onOpenChange(false);
      router.push(`${accountHref(accountId)}/statements?fy=${fy}`);
      router.refresh();
      void refreshAfterDelete();
    } catch (e) {
      showToast(getErrorMessage(e, "Couldn't delete the statement. Try again."), { tone: 'danger' });
    }
  };

  return (
    <ConfirmDialog
      open={open}
      onOpenChange={(next) => {
        if (!remove.isPending) onOpenChange(next);
      }}
      title="Delete statement?"
      description={`Removes the ${periodEndLabel} statement and what it added to this account.`}
      impact={preview.data ? deletionImpact(preview.data) : undefined}
      previewLoading={preview.isLoading}
      checkingMessage="Checking what this statement added…"
      confirmLabel="Delete"
      confirmLoading={remove.isPending}
      confirmDisabled={!preview.data}
      onConfirm={confirm}
    >
      {preview.error ? (
        <Banner tone="danger">{getErrorMessage(preview.error, "Couldn't check this statement. Try again.")}</Banner>
      ) : null}
      {preview.data ? (
        <Text variant="caption" tone="ink-3" as="p">
          {deletionNote(source)}
        </Text>
      ) : null}
      <IrreversibleNote />
    </ConfirmDialog>
  );
}

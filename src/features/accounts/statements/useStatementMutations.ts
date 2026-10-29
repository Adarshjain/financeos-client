'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

import { deleteStatement, loadStatementDeletionPreview } from '@/features/accounts/accountActions';
import { unwrapAction } from '@/lib/actionResult';
import type { components } from '@/lib/api/schema';
import {
  invalidateLendingQueries,
  invalidateMoneyQueries,
  invalidateRewardQueries,
} from '@/lib/query/invalidate';
import { keys } from '@/lib/query/keys';

export type StatementDeletionPreview = components['schemas']['StatementDeletionPreviewResponse'];
export type StatementDeletionResult = components['schemas']['StatementDeletionResponse'];

/**
 * Preview (fetched only while the confirmation is open) and delete for one statement. Deleting
 * removes transactions and can unlink loans/lendings, reopen alerts and clear duplicate flags,
 * so everything those feed is refetched.
 */
export function useDeleteStatement(accountId: string, statementId: string, confirming: boolean) {
  const qc = useQueryClient();

  const preview = useQuery({
    queryKey: [...keys.statements.detail(statementId), 'deletion-preview', accountId],
    queryFn: () => unwrapAction(loadStatementDeletionPreview(accountId, statementId)),
    enabled: confirming,
    staleTime: 0,
  });

  const remove = useMutation({
    mutationFn: () => unwrapAction(deleteStatement(accountId, statementId)),
  });

  // Called once the dialogs showing this statement have closed: refetching while they are open
  // would ask for the deleted statement's detail and preview and flash a 404.
  const refreshAfterDelete = () => {
    qc.removeQueries({ queryKey: keys.statements.detail(statementId) });
    return Promise.all([
      qc.invalidateQueries({ queryKey: keys.statements.all }),
      qc.invalidateQueries({ queryKey: keys.transactions.all }),
      qc.invalidateQueries({ queryKey: keys.bills.all }),
      qc.invalidateQueries({ queryKey: keys.inbox.all }),
      invalidateMoneyQueries(qc),
      invalidateLendingQueries(qc),
      invalidateRewardQueries(qc),
    ]).then(() => undefined);
  };

  return { preview, remove, refreshAfterDelete };
}

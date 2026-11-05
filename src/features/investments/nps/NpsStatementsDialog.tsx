'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import React from 'react';

import { Button } from '@/components/ds/Button/Button';
import { ConfirmDialog, Dialog } from '@/components/ds/Dialog/Dialog';
import { EmptyState } from '@/components/ds/EmptyState/EmptyState';
import { ListRow } from '@/components/ds/ListRow/ListRow';
import { Skeleton } from '@/components/ds/Skeleton/Skeleton';
import { showToast } from '@/components/ds/Toast/Toast';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { watchSession } from '@/lib/authExpiry';
import { keys } from '@/lib/query/keys';

import { loadNpsStatements } from './npsActions';
import { type NpsStatement, statementRowSub, statementRowTitle } from './npsImportModel';
import { useNpsMutations } from './useNpsMutations';

export interface NpsStatementsDialogProps {
  accountId: string;
  onClose: () => void;
}

/** The statements imported into the account, newest first; Delete removes one with the entries it brought in. */
export function NpsStatementsDialog({ accountId, onClose }: NpsStatementsDialogProps) {
  const qc = useQueryClient();
  const mutations = useNpsMutations();
  const queryKey = [...keys.nps.all, 'statements', accountId];
  const query = useQuery({
    queryKey,
    gcTime: 0,
    queryFn: async (): Promise<NpsStatement[]> => {
      const result = await watchSession(loadNpsStatements(accountId));
      if (!result.success) throw new Error(result.error.message);
      return result.data;
    },
  });
  const [deleting, setDeleting] = React.useState<NpsStatement | null>(null);
  const rows = [...(query.data ?? [])].sort((a, b) => (a.periodEnd < b.periodEnd ? 1 : -1));

  const remove = async () => {
    if (!deleting) return;
    try {
      await mutations.deleteStatement.mutateAsync(deleting.id);
      setDeleting(null);
      await qc.invalidateQueries({ queryKey });
      await mutations.refresh();
      void showToast('Statement deleted');
    } catch (e) {
      void showToast(getErrorMessage(e, "Couldn't delete the statement. Try again."), { tone: 'danger' });
    }
  };

  return (
    <>
      <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
        <Dialog.Content size="md" title="Statements" description="Imported into this account." secondary={{ label: 'Close', onSelect: onClose }}>
          <Dialog.Body>
            {query.isError ? (
              <EmptyState compact description="Couldn't load the statements. Close this and try again." />
            ) : !query.data ? (
              <Skeleton height={96} />
            ) : rows.length === 0 ? (
              <EmptyState compact description="No statements imported yet" />
            ) : (
              rows.map((s) => (
                <ListRow
                  key={s.id}
                  wrap
                  title={statementRowTitle(s)}
                  subtitle={statementRowSub(s)}
                  trailing={
                    <Button variant="link" size="sm" onClick={() => setDeleting(s)}>
                      Delete
                    </Button>
                  }
                />
              ))
            )}
          </Dialog.Body>
        </Dialog.Content>
      </Dialog>
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open && !mutations.deleteStatement.isPending) setDeleting(null);
        }}
        title="Delete this statement?"
        description="The entries it brought in go too, and the units are checked again. Entries it only confirmed keep their exact units. This can't be undone."
        confirmLabel="Delete"
        confirmLoading={mutations.deleteStatement.isPending}
        onConfirm={() => void remove()}
      />
    </>
  );
}

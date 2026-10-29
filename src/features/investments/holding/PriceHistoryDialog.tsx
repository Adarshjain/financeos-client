'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

import { Button, Conceal, ConfirmDialog, Dialog, DialogBody, DialogContent, EmptyState, ListRow, Pager, showToast, Skeleton, Text } from '@/components/ds';
import { IrreversibleNote } from '@/features/shell/IrreversibleNote';
import { getErrorMessage } from '@/lib/api/errorMessage';
import { watchSession } from '@/lib/authExpiry';

import { usePriceMutations } from '../usePriceMutations';
import { loadPricesPage } from './holdingActions';
import { type HoldingSection, priceDescription, type PriceRowModel } from './holdingModel';
import { PriceDialog, type PriceDialogTarget } from './PriceDialog';

export interface PriceHistoryDialogProps {
  instrumentId: string;
  name: string;
  onClose: () => void;
}

/** The newest prices first, a page at a time from the server. Only the user's own manual prices carry Edit and Delete. */
export function PriceHistoryDialog({ instrumentId, name, onClose }: PriceHistoryDialogProps) {
  const router = useRouter();
  const { deletePrice } = usePriceMutations(instrumentId);
  const [section, setSection] = React.useState<HoldingSection<PriceRowModel> | null>(null);
  const [failed, setFailed] = React.useState(false);
  const [editing, setEditing] = React.useState<PriceDialogTarget | null>(null);
  const [deleting, setDeleting] = React.useState<PriceRowModel | null>(null);

  const load = React.useCallback(
    async (page: number) => {
      const result = await watchSession(loadPricesPage(instrumentId, page));
      if (result.success) {
        setSection(result.data);
        setFailed(false);
      } else {
        setFailed(true);
        showToast(result.error.message, { tone: 'danger' });
      }
    },
    [instrumentId],
  );
  // Read once when the dialog opens.
  React.useEffect(() => {
    void load(0);
  }, [load]);

  const page = section?.position.page ?? 0;
  const confirmDelete = async () => {
    const row = deleting;
    if (!row?.id) return;
    try {
      await deletePrice.mutateAsync(row.id);
      showToast('Price deleted');
      setDeleting(null);
      router.refresh();
      // The last row of the last page went: show the page before it.
      await load(section && section.rows.length === 1 && page > 0 ? page - 1 : page);
    } catch (e) {
      showToast(getErrorMessage(e, "Couldn't delete the price. Try again."), { tone: 'danger' });
    }
  };

  const pager = section ? (
    <Pager
      variant="compact"
      page={section.position.page}
      size={section.position.size}
      totalElements={section.position.totalElements}
      totalPages={section.position.totalPages}
      onPageChange={(next) => void load(next)}
    />
  ) : null;

  return (
    <>
      <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
        <DialogContent
          size="md"
          title="Price history"
          description={`${name} · newest first · only your manual prices can change`}
          secondary={{ label: 'Close', onSelect: onClose }}
        >
          <DialogBody className="p-0 gap-0 desk:gap-0">
            {section === null && !failed ? <Skeleton height={48} /> : null}
            {section === null && failed ? (
              <EmptyState compact description="Couldn't load the price history." action={{ label: 'Retry', onSelect: () => void load(0), variant: 'link' }} />
            ) : null}
            {section && section.rows.length === 0 ? <EmptyState compact description="No prices yet" /> : null}
            {section && section.rows.length > 0 ? pager : null}
            {section?.rows.map((r) => (
              <ListRow
                key={r.id ?? `${r.asOf}-${r.source}`}
                title={r.time ? `${r.date}, ${r.time}` : r.date}
                subtitle={r.source}
                trailing={
                  <span className="flex items-center gap-space-8">
                    <Text variant="body-strong"><Conceal>{r.amount}</Conceal></Text>
                    {r.editable ? (
                      <>
                        <Button variant="secondary" size="sm" onClick={() => setEditing({ kind: 'edit', row: r })}>
                          Edit
                        </Button>
                        <Button variant="danger" size="sm" onClick={() => setDeleting(r)}>
                          Delete
                        </Button>
                      </>
                    ) : null}
                  </span>
                }
              />
            ))}
            {section && section.rows.length > 0 ? pager : null}
          </DialogBody>
        </DialogContent>
      </Dialog>
      {editing ? (
        <PriceDialog
          instrumentId={instrumentId}
          name={name}
          target={editing}
          onSaved={() => void load(page)}
          onClose={() => setEditing(null)}
        />
      ) : null}
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open && !deletePrice.isPending) setDeleting(null);
        }}
        title="Delete manual price?"
        description={deleting ? `Your manual price of ${priceDescription(deleting)} goes.` : ''}
        impact={['Only this price is deleted.', 'Your trades and the other prices stay.']}
        confirmLabel="Delete price"
        confirmLoading={deletePrice.isPending}
        onConfirm={() => void confirmDelete()}
      >
        <IrreversibleNote />
      </ConfirmDialog>
    </>
  );
}

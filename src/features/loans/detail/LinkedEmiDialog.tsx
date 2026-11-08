'use client';

import React from 'react';

import { Dialog } from '@/components/ds/Dialog/Dialog';
import { Text } from '@/components/ds/Text/Text';
import { formatDate, formatMoney } from '@/lib/format';
import type { InstallmentDto } from '@/lib/loan.types';

export interface LinkedEmiDialogProps {
  installment: InstallmentDto;
  /** The unlink is saving: Unlink shows loading, Cancel waits. */
  unlinking?: boolean;
  onUnlink: () => void;
  onClose: () => void;
}

/** What a paid EMI is linked to, with Unlink (which can be undone from the Toast). */
export function LinkedEmiDialog({ installment, unlinking = false, onUnlink, onClose }: LinkedEmiDialogProps) {
  const payment = installment.payment;
  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <Dialog.Content
        size="sm"
        title={`EMI #${installment.seq}`}
        description="Paid and linked to a bank transaction."
        secondary={{ label: 'Cancel', onSelect: onClose, disabled: unlinking }}
        primary={{ label: 'Unlink', onSelect: onUnlink, loading: unlinking }}
      >
        <Dialog.Body>
          {payment ? (
            <Text variant="body" as="p">
              {`Paid ${formatMoney(payment.amount, { decimals: 'auto' })} on ${formatDate(payment.paymentDate, 'full')}`}
            </Text>
          ) : null}
          <Text variant="caption" tone="ink-3" as="p">
            Unlinking marks the EMI unpaid again. You can undo it right after.
          </Text>
        </Dialog.Body>
      </Dialog.Content>
    </Dialog>
  );
}

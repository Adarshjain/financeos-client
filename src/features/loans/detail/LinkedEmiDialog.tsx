'use client';

import React from 'react';

import { Dialog, Text } from '@/components/ds';
import { formatDate, formatMoney } from '@/lib/format';
import type { InstallmentDto } from '@/lib/loan.types';

export interface LinkedEmiDialogProps {
  installment: InstallmentDto;
  onUnlink: () => void;
  onClose: () => void;
}

/** What a paid EMI is linked to, with Unlink (which can be undone from the Toast). */
export function LinkedEmiDialog({ installment, onUnlink, onClose }: LinkedEmiDialogProps) {
  const payment = installment.payment;
  return (
    <Dialog open onOpenChange={(open) => (open ? undefined : onClose())}>
      <Dialog.Content
        size="sm"
        title={`EMI #${installment.seq}`}
        description="Paid and linked to a bank transaction."
        secondary={{ label: 'Cancel', onSelect: onClose }}
        primary={{ label: 'Unlink', onSelect: onUnlink }}
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

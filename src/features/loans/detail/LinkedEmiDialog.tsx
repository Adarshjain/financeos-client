'use client';

import React from 'react';

import { Dialog, DialogBody, DialogContent, Text } from '@/components/ds';
import { formatDayMonthYear, formatRupees } from '@/features/accounts/list/accountsList';
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
      <DialogContent
        size="sm"
        title={`EMI #${installment.seq}`}
        description="Paid and linked to a bank transaction."
        secondary={{ label: 'Cancel', onSelect: onClose }}
        primary={{ label: 'Unlink', onSelect: onUnlink }}
      >
        <DialogBody>
          {payment ? (
            <Text variant="body" as="p">
              {`Paid ${formatRupees(payment.amount)} on ${formatDayMonthYear(payment.paymentDate)}`}
            </Text>
          ) : null}
          <Text variant="caption" tone="ink-3" as="p">
            Unlinking marks the EMI unpaid again. You can undo it right after.
          </Text>
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

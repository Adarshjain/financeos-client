'use client';

import React from 'react';

import { Button } from '@/components/ds/Button/Button';
import { MarkPaidDialog } from '@/features/bills/MarkPaidDialog';

import type { MarkPaidTarget } from '../overview/headerModel';

/** The header row of the card Statements tab: Mark paid for the current open bill. */
export function MarkPaidAction({
  accountName,
  target,
}: {
  accountName: string;
  target: MarkPaidTarget;
}) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="hidden desk:flex justify-end">
      <Button variant="primary" onClick={() => setOpen(true)}>
        Mark paid
      </Button>
      <MarkPaidDialog
        open={open}
        onOpenChange={setOpen}
        statementId={target.statementId}
        cardName={accountName}
        remaining={target.remaining}
      />
    </div>
  );
}

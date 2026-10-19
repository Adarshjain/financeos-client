'use client';

import React from 'react';

import { Button, DateField, Text } from '@/components/ds';
import { formatDayMonthYear } from '@/features/accounts/list/accountsList';

function Heading({ children, tone = 'ink-3' }: { children: React.ReactNode; tone?: 'ink-3' | 'danger' }) {
  return (
    <Text variant="overline" tone={tone} as="h3">
      {children}
    </Text>
  );
}

/** Close account (a date and a button) or, for a closed account, when it closed and Reopen. */
export function CloseAccountSection({
  closedOn,
  today,
  closeDate,
  onCloseDateChange,
  closing,
  reopening,
  disabled,
  onClose,
  onReopen,
  noun,
}: {
  closedOn?: string | null;
  today: string;
  closeDate: string;
  onCloseDateChange: (iso: string) => void;
  closing: boolean;
  reopening: boolean;
  disabled: boolean;
  onClose: () => void;
  onReopen: () => void;
  noun: string;
}) {
  if (closedOn) {
    return (
      <section className="flex flex-col gap-space-12">
        <Heading>Close account</Heading>
        <div className="flex items-center justify-between gap-space-12">
          <div className="flex flex-col min-w-0">
            <Text variant="body-strong">Closed on {formatDayMonthYear(closedOn)}</Text>
            <Text variant="caption" tone="ink-3">
              All transactions and statements are kept.
            </Text>
          </div>
          <Button variant="secondary" size="sm" loading={reopening} disabled={disabled} onClick={onReopen}>
            Reopen account
          </Button>
        </div>
      </section>
    );
  }
  return (
    <section className="flex flex-col gap-space-12">
      <Heading>Close account</Heading>
      <Text variant="caption" tone="ink-3" as="p">
        {`Closing keeps every transaction and statement; the ${noun} drops out of active lists from this date.`}
      </Text>
      <div className="grid grid-cols-1 desk:grid-cols-2 gap-space-12 items-end">
        <DateField label="Closed on" today={today} value={closeDate} onValueChange={(v) => onCloseDateChange(v as string)} />
        <Button variant="secondary" loading={closing} disabled={disabled} onClick={onClose} className="w-full">
          Close account
        </Button>
      </div>
    </section>
  );
}

export function DeleteAccountSection({ disabled, onDelete }: { disabled: boolean; onDelete: () => void }) {
  return (
    <section className="flex flex-col gap-space-12">
      <Heading tone="danger">Delete account</Heading>
      <div className="flex items-center gap-space-12">
        <Text variant="caption" tone="ink-3" as="p" className="flex-1">
          Permanently removes this account and everything recorded on it.
        </Text>
        <Button variant="danger" size="sm" disabled={disabled} onClick={onDelete}>
          Delete account
        </Button>
      </div>
    </section>
  );
}

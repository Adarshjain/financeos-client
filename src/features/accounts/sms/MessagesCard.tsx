'use client';

import React from 'react';

import { Card } from '@/components/ds/Card/Card';
import { ListRow } from '@/components/ds/ListRow/ListRow';
import { Pager } from '@/components/ds/Pager/Pager';
import { Text } from '@/components/ds/Text/Text';
import { showToast } from '@/components/ds/Toast/Toast';
import type { SmsMessage, SmsMessagesPage, SmsMessageStatus } from '@/lib/sms.types';
import type { ApiResult } from '@/lib/types';

import { confirmSmsMessage, loadSmsMessages, rejectSmsMessage } from './smsActions';
import { dmy, readSummary } from './smsModel';
import { useSmsRun } from './useSmsRun';

interface MessagesCardProps {
  status: Extract<SmsMessageStatus, 'NEEDS_CONFIRM' | 'COULD_NOT_READ'>;
  title: string;
  subtitle: string;
  initial: SmsMessagesPage;
}

/** A server-side paginated list of stored messages in one status, with Not a transaction (and Confirm for the ones to check). */
export function MessagesCard({ status, title, subtitle, initial }: MessagesCardProps) {
  const { run, refresh } = useSmsRun();
  const [data, setData] = React.useState<SmsMessagesPage>(initial);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const load = async (page: number): Promise<void> => {
    const result = await run(() => loadSmsMessages(status, page, data.size), { refresh: false });
    if (!result.success) return;
    // The page emptied (the last row was handled): step back one.
    if (result.data.items.length === 0 && page > 0) return load(page - 1);
    setData(result.data);
  };

  const handle = async (message: SmsMessage, work: () => Promise<ApiResult<unknown>>): Promise<boolean> => {
    if (busyId) return false;
    setBusyId(message.id);
    try {
      const result = await run(work, { refresh: false });
      if (!result.success) return false;
      await load(data.page);
      refresh();
      return true;
    } finally {
      setBusyId(null);
    }
  };

  const confirm = (message: SmsMessage) =>
    handle(message, () =>
      confirmSmsMessage(message.id, {
        ...(message.amount !== null ? { amount: message.amount } : {}),
        ...(message.direction ? { direction: message.direction } : {}),
        ...(message.txnDate ? { txnDate: message.txnDate } : {}),
        ...(message.counterparty ? { counterparty: message.counterparty } : {}),
      }),
    ).then((ok) => {
      if (ok) showToast('Confirmed');
    });

  if (data.total === 0) return null;

  const pager = (borderPosition: 'top' | 'bottom') => (
    <Pager
      variant="compact"
      borderPosition={borderPosition}
      page={data.page}
      size={data.size}
      totalElements={data.total}
      unit="messages"
      onPageChange={(page) => void load(page)}
    />
  );

  return (
    <Card data-testid={`sms-messages-${status.toLowerCase()}`} title={title} subtitle={subtitle}>
      {pager('bottom')}
      <div>
        {data.items.map((message) => (
          <ListRow
            key={message.id}
            wrap
            data-testid="sms-message-row"
            disabled={busyId === message.id}
            title={message.accountName ?? message.provider ?? message.sender}
            subtitle={
              <>
                <span className="block">{readSummary(message) || 'Nothing could be read'}</span>
                <span className="block">
                  {message.sender} · received {dmy(message.receivedAt)}
                </span>
              </>
            }
            actions={[
              ...(status === 'NEEDS_CONFIRM' ? [{ id: 'confirm', label: 'Confirm', onSelect: () => void confirm(message) }] : []),
              { id: 'reject', label: 'Not a transaction', onSelect: () => void handle(message, () => rejectSmsMessage(message.id)) },
            ]}
          >
            <Text variant="body" as="p" className="mt-space-4 break-words">
              {message.body}
            </Text>
          </ListRow>
        ))}
      </div>
      {pager('top')}
    </Card>
  );
}

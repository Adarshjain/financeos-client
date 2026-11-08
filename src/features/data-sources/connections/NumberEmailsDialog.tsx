'use client';

import { useQuery } from '@tanstack/react-query';
import React, { useState } from 'react';

import { Banner } from '@/components/ds/Banner/Banner';
import { Button } from '@/components/ds/Button/Button';
import { Card } from '@/components/ds/Card/Card';
import { Dialog } from '@/components/ds/Dialog/Dialog';
import { Pager } from '@/components/ds/Pager/Pager';
import { StatusWord } from '@/components/ds/StatusWords/StatusWords';
import { Text } from '@/components/ds/Text/Text';
import { unwrapAction } from '@/lib/actionResult';
import type { Schemas, UnknownNumberGroup } from '@/lib/api/types';
import { formatDate, formatMoney } from '@/lib/format';
import { keys } from '@/lib/query/keys';

import { numberTitle } from './attentionItemModel';
import { Details } from './AttentionItemRow';
import { loadNumberEmails } from './gmailActions';

const PAGE_SIZE = 10;

type NumberEmail = Schemas['NumberGroupEmailResponse'];

function EmailRow({ email }: { email: NumberEmail }) {
  const [open, setOpen] = useState(false);
  const { item } = email;
  const read = email.amount != null ? `${formatMoney(email.amount, { decimals: 'auto' })}${email.direction ? ` ${email.direction}` : ''}` : null;
  return (
    <Card.Row data-testid="number-email" className="flex-col items-stretch">
      <div className="flex flex-col gap-space-4 min-w-0">
        <div className="flex flex-wrap items-center gap-x-space-8 gap-y-space-4">
          <StatusWord tone="neutral">{email.kind === 'STATEMENT' ? 'Statement' : 'Alert'}</StatusWord>
          <Text variant="caption" tone="ink-3" className="break-all">
            {formatDate(item.internalDate ?? item.discoveredAt, 'list')}
            {item.senderAddress ? ` · ${item.senderAddress}` : ''}
          </Text>
        </div>
        <Text variant="body-strong" as="p" className="break-words">
          {item.subject || '(no subject)'}
        </Text>
        {read ? (
          <Text variant="body" tone="ink-2" as="p">
            {read}
          </Text>
        ) : null}
        <div>
          <Text variant="label" as="span">
            <Button variant="link" size="sm" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
              {open ? 'Hide details' : 'Details'}
            </Button>
          </Text>
        </div>
        {open ? <Details item={item} archived={false} /> : null}
      </div>
    </Card.Row>
  );
}

/** The emails of one unknown number, newest first, a page at a time: date, subject, sender, kind and the amount read. */
export function NumberEmailsDialog({ group, onClose }: { group: UnknownNumberGroup | null; onClose: () => void }) {
  const [page, setPage] = useState(0);
  const key = group ? `${group.bank ?? ''}:${group.last4}` : null;
  const [shownKey, setShownKey] = useState(key);
  if (shownKey !== key) {
    setShownKey(key);
    setPage(0);
  }
  const query = useQuery({
    queryKey: keys.settings.gmailAttention({ numberEmails: true, bank: group?.bank ?? null, last4: group?.last4 ?? null, page }),
    queryFn: () => unwrapAction(loadNumberEmails({ bank: group?.bank ?? undefined, last4: group?.last4 ?? '', page, size: PAGE_SIZE })),
    enabled: group !== null,
  });
  const data = query.data;
  // The group shrank (mail settled elsewhere) under a later page: go back to its last page.
  if (data && page > 0 && page > data.totalPages - 1) setPage(Math.max(0, data.totalPages - 1));

  return (
    <Dialog open={group !== null} onOpenChange={(open) => (open ? undefined : onClose())}>
      <Dialog.Content
        size="md"
        title="Emails for this number"
        description={group ? numberTitle(group) : undefined}
        secondary={{ label: 'Close', onSelect: onClose }}
      >
        <Dialog.Body>
          {query.isError ? <Banner tone="danger">{"Couldn't load the emails of this number. Try again."}</Banner> : null}
          {query.isLoading ? (
            <Text variant="body" tone="ink-3" as="p">
              Loading emails…
            </Text>
          ) : null}
          {data && data.content.length === 0 ? (
            <Text variant="body" tone="ink-3" as="p">
              No emails are waiting for this number.
            </Text>
          ) : null}
          {data && data.content.length > 0 ? (
            <Card>
              {data.content.map((email) => (
                <EmailRow key={email.item.id} email={email} />
              ))}
              {data.totalPages > 1 ? (
                <Pager
                  page={page}
                  size={data.size}
                  totalElements={data.totalElements}
                  totalPages={data.totalPages}
                  summary={({ start, end, total }) => `${start}–${end} of ${total}`}
                  onPageChange={setPage}
                  borderPosition="top"
                />
              ) : null}
            </Card>
          ) : null}
        </Dialog.Body>
      </Dialog.Content>
    </Dialog>
  );
}

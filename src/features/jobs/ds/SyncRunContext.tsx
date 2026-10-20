'use client';

import React, { useState } from 'react';

import { Button, Icon, Text } from '@/components/ds';
import { numericDate, numericDateTime } from '@/features/jobs/format';
import type { SyncSummary } from '@/lib/types';

function ContextRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-space-12">
      <Text variant="caption" tone="ink-3" className="w-space-64 shrink-0">
        {label}
      </Text>
      <Text variant="caption" tone="ink-2" className="min-w-0 break-all">
        {children}
      </Text>
    </div>
  );
}

/** Which mailbox, senders and date window a sync run searched, and how much of what Gmail returned was new. */
export function SyncRunContext({ result }: { result: SyncSummary }) {
  const [sendersOpen, setSendersOpen] = useState(false);
  const senders = result.senders ?? [];

  return (
    <div className="flex flex-col gap-space-4">
      {result.mailbox ? (
        <ContextRow label="Mailbox">
          <Text variant="caption" tone="ink" as="strong">
            {result.mailbox}
          </Text>
        </ContextRow>
      ) : null}
      <ContextRow label="Searched">
        {result.searchedSince ? `New mail since ${numericDateTime(result.searchedSince)}` : 'Nothing listed'}
        {result.backfilledTo ? ` · backfilled to ${numericDate(result.backfilledTo)}` : ''}
      </ContextRow>
      <ContextRow label="Found">
        Gmail returned {result.listed ?? 0} email{result.listed === 1 ? '' : 's'}, {result.discovered ?? 0} new
      </ContextRow>
      <div className="flex flex-col gap-space-4">
        <Text variant="caption" tone="ink-2" as="div">
          <Button
            variant="link"
            disabled={senders.length === 0}
            aria-expanded={sendersOpen}
            onClick={() => setSendersOpen((v) => !v)}
            icon={
              senders.length > 0 ? <Icon name={sendersOpen ? 'chevron-down' : 'chevron-right'} size="xs" /> : undefined
            }
          >
            Senders checked ({senders.length})
          </Button>
        </Text>
        {sendersOpen ? (
          <ul className="flex flex-col gap-space-2 pl-space-16">
            {senders.map((s) => (
              <Text key={s} as="li" variant="caption" tone="ink-2" className="break-all">
                {s}
              </Text>
            ))}
          </ul>
        ) : null}
      </div>
    </div>
  );
}

'use client';

import Link from 'next/link';
import React from 'react';

import {
  Badge,
  Button,
  Card,
  StatusWord,
  Text,
} from '@/components/ds';
import { MarkPaidDialog } from '@/features/bills/MarkPaidDialog';

import { accountHref } from '../accountTabsModel';
import type { HeaderModel } from './headerModel';

/** The block at the top of every account page: the headline figure, and the account's actions. */
export function AccountHeaderCard({
  accountId,
  accountName,
  model,
}: {
  accountId: string;
  accountName: string;
  model: HeaderModel;
}) {
  const [markPaidOpen, setMarkPaidOpen] = React.useState(false);
  const base = accountHref(accountId);

  return (
    <Card>
      <div className="p-space-16 flex flex-wrap items-center gap-space-16">
        <div className="min-w-0">
          <Text variant="label" tone="ink-3" as="div">
            {model.label}
          </Text>
          <Text variant="hero-figure" as="div" className="mt-space-2">
            {model.figure}
          </Text>
          {model.badge || model.caption.length > 0 || model.closedLabel ? (
            <div className="flex flex-wrap items-center gap-space-6 mt-space-2">
              {model.badge ? <Badge tone="neutral">{model.badge}</Badge> : null}
              {model.caption.length > 0 ? (
                <Text variant="caption" tone="ink-3">
                  {model.caption.join(' · ')}
                </Text>
              ) : null}
              {model.closedLabel ? <StatusWord tone="neutral">{model.closedLabel}</StatusWord> : null}
            </div>
          ) : null}
        </div>
        <div className="flex items-center gap-space-8 w-full desk:w-auto">
          {model.markPaid ? (
            <Button
              variant="primary"
              className="flex-1 desk:flex-none"
              onClick={() => setMarkPaidOpen(true)}
            >
              Mark paid
            </Button>
          ) : null}
          <Button asChild variant="secondary" className="flex-1 desk:flex-none">
            <Link href={`${base}?edit=1`}>Edit</Link>
          </Button>
        </div>
      </div>
      {model.markPaid ? (
        <MarkPaidDialog
          open={markPaidOpen}
          onOpenChange={setMarkPaidOpen}
          statementId={model.markPaid.statementId}
          cardName={accountName}
          remaining={model.markPaid.remaining}
        />
      ) : null}
    </Card>
  );
}

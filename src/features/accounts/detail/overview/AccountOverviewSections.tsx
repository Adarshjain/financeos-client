'use client';

import Link from 'next/link';
import React from 'react';

import { Button } from '@/components/ds/Button/Button';
import { Card } from '@/components/ds/Card/Card';
import { ListField } from '@/components/ds/ListField/ListField';
import { ListRow } from '@/components/ds/ListRow/ListRow';
import { StatusWord } from '@/components/ds/StatusWords/StatusWords';
import { Text } from '@/components/ds/Text/Text';
import { appHref } from '@/features/shell/routes';

import type {
  BrokerCashModel,
  GmailCardModel,
  LinkedLine,
  StatementRowModel,
} from './accountOverviewModel';
import { HeaderLink } from './HeaderLink';

export function StatementsCard({
  accountId,
  row,
  canUpload,
}: {
  accountId: string;
  row: StatementRowModel | null;
  canUpload: boolean;
}) {
  return (
    <Card
      title="Statements"
      subtitle="Upload monthly PDF or XLSX"
      action={
        canUpload ? (
          <HeaderLink href={`/transactions/import?account=${accountId}`}>Upload</HeaderLink>
        ) : undefined
      }
    >
      {row ? (
        <ListRow asChild>
          <Link href={appHref(`/accounts/${accountId}/statements?statement=${row.id}`)}>
            <span className="flex-1 min-w-0">
              <Text variant="body-strong" as="div">
                {row.title}
              </Text>
              <Text variant="caption" tone="ink-3" as="div">
                {row.caption}
              </Text>
            </span>
            {row.gap ? <StatusWord tone="warning">Gap</StatusWord> : null}
          </Link>
        </ListRow>
      ) : (
        <div className="px-space-16 pb-space-14">
          <Text variant="caption" tone="ink-3">
            No statements yet
          </Text>
        </div>
      )}
    </Card>
  );
}

export function GmailAlertsCard({ model }: { model: GmailCardModel }) {
  return (
    <Card
      title="Gmail alerts"
      subtitle={model.subtitle}
      action={
        <StatusWord tone={model.active ? 'success' : 'neutral'}>
          {model.active ? 'Active' : 'Off'}
        </StatusWord>
      }
    >
      {model.lastAlert ? <ListField label="Last alert" value={model.lastAlert} /> : null}
      {model.unmatched ? (
        <ListField
          label="Needs attention"
          value={
            <Text variant="body" tone="warning" as="span">
              {model.unmatched} unmatched ·{' '}
              <Text variant="label" as="span">
                <Button asChild variant="link" size="sm">
                  <Link href={appHref('/inbox')}>assign</Link>
                </Button>
              </Text>
            </Text>
          }
        />
      ) : null}
    </Card>
  );
}

export function LinkedCard({ lines }: { lines: LinkedLine[] }) {
  return (
    <Card title="Linked" subtitle="What pays from this account">
      {lines.map((line) => (
        <ListField key={line.key} label={line.label} value={line.value} />
      ))}
    </Card>
  );
}

export function BrokerCashCard({ model }: { model: BrokerCashModel }) {
  return (
    <Card
      title="Cash"
      subtitle="Ledger balance at broker"
      action={
        <HeaderLink href="/investments">
          Investments
        </HeaderLink>
      }
    >
      <ListField label="Available" value={model.available} />
      {model.lastTransferIn ? <ListField label="Last transfer in" value={model.lastTransferIn} /> : null}
    </Card>
  );
}

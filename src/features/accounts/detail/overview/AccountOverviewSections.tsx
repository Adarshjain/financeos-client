'use client';

import Link from 'next/link';
import React from 'react';

import {
  Button,
  Card,
  KpiTile,
  ListField,
  ListRow,
  StatusWord,
  Text,
} from '@/components/ds';

import type {
  BrokerCashModel,
  DetailLine,
  GmailCardModel,
  KpiModel,
  LinkedLine,
  StatementRowModel,
} from './accountOverviewModel';
import { HeaderLink } from './HeaderLink';

export function FlowKpis({ tiles }: { tiles: KpiModel[] }) {
  return (
    <div className="grid grid-cols-2 desk:grid-cols-3 gap-space-12 desk:gap-space-16">
      {tiles.map((t) => (
        <KpiTile key={t.label} label={t.label} value={t.value} context={t.context} />
      ))}
    </div>
  );
}

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
          <Button asChild variant="secondary" size="sm">
            <Link href={`/transactions/import?account=${accountId}`}>Upload</Link>
          </Button>
        ) : undefined
      }
    >
      {row ? (
        <ListRow asChild chevron>
          <Link href={`/ds/accounts/${accountId}/statements?statement=${row.id}`}>
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
              <Text variant="caption" as="span">
                <Button asChild variant="link" size="sm">
                  <Link href="/inbox">assign</Link>
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

export function WalletDetailsCard({ lines }: { lines: DetailLine[] }) {
  return (
    <Card title="Details" subtitle="Wallets and cash have no statements or cards">
      {lines.map((line) => (
        <ListField key={line.label} label={line.label} value={line.value} />
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
        <HeaderLink href="/investments" chevron>
          Investments
        </HeaderLink>
      }
    >
      <ListField label="Available" value={model.available} />
      {model.lastTransferIn ? <ListField label="Last transfer in" value={model.lastTransferIn} /> : null}
    </Card>
  );
}

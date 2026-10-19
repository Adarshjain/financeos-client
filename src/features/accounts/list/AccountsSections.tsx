'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React from 'react';

import {
  Badge,
  Button,
  Card,
  CardFooter,
  createDataTableColumnHelper,
  DataTable,
  EmptyState,
  Icon,
  ProgressBar,
  StatusWord,
  Text,
} from '@/components/ds';

import type {
  BankRow,
  BrokerRow,
  CardBaseRow,
  ClosedSection,
  WalletRow,
} from './accountsList';

const ACCOUNTS_HREF = '/ds/accounts';

function rowHref(row: { id: string }): string {
  return `${ACCOUNTS_HREF}/${row.id}`;
}

function NameCell({
  name,
  last4,
  sub,
}: {
  name: string;
  last4?: string | null;
  sub?: string | null;
}) {
  return (
    <div className="flex flex-col min-w-0">
      <div className="flex items-baseline gap-space-6 min-w-0">
        <Text variant="body-strong" truncate>
          {name}
        </Text>
        {last4 ? (
          <Text variant="caption" tone="ink-3">
            ••{last4}
          </Text>
        ) : null}
      </div>
      {sub ? (
        <Text variant="caption" tone="ink-3" truncate>
          {sub}
        </Text>
      ) : null}
    </div>
  );
}

function OpenButton({ row }: { row: { id: string; name: string } }) {
  return (
    <Button
      asChild
      variant="ghost"
      size="sm"
      iconOnly
      aria-label={`Open ${row.name}`}
    >
      <Link href={rowHref(row)}>
        <Icon name="chevron-right" size="sm" />
      </Link>
    </Button>
  );
}

function IconLink({
  href,
  label,
  icon,
}: {
  href: string;
  label: string;
  icon: 'file-text' | 'pencil-simple';
}) {
  return (
    <Button asChild variant="ghost" size="sm" iconOnly aria-label={label}>
      <Link href={href}>
        <Icon name={icon} size="sm" />
      </Link>
    </Button>
  );
}

function uploadHref(row: { id: string }): string {
  return `/transactions/import?account=${row.id}`;
}

function ClosedFooter({
  line,
  section,
  showing,
}: {
  line: string | null;
  section: ClosedSection;
  showing: boolean;
}) {
  if (!line) return null;
  return (
    <CardFooter>
      <Text variant="label" tone="ink-3">
        {line}
      </Text>
      <Button asChild variant="link" size="sm">
        <Link
          href={showing ? ACCOUNTS_HREF : `${ACCOUNTS_HREF}?closed=${section}`}
        >
          {showing ? 'Hide' : 'Show'}
          <Icon name={showing ? 'chevron-up' : 'chevron-right'} size="sm" />
        </Link>
      </Button>
    </CardFooter>
  );
}

function AddLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Text variant="caption" as="span">
      <Button asChild variant="link" size="sm">
        <Link href={href}>{children}</Link>
      </Button>
    </Text>
  );
}

function NavLink({
  href,
  children,
}: {
  href: string;
  children: React.ReactNode;
}) {
  return (
    <Text variant="caption" as="span" className="hidden desk:inline">
      <Button asChild variant="link" size="sm">
        <Link href={href}>
          {children}
          <Icon name="chevron-right" size="sm" />
        </Link>
      </Button>
    </Text>
  );
}

function closedState(row: { closed: boolean }) {
  return row.closed ? { disabled: true } : undefined;
}

interface SectionProps<Row> {
  rows: Row[];
  closedRows: Row[];
  closedLine: string | null;
  showClosed: boolean;
}

function withClosed<Row>({
  rows,
  closedRows,
  showClosed,
}: SectionProps<Row>): Row[] {
  return showClosed ? [...rows, ...closedRows] : rows;
}

// ---- Bank accounts ---------------------------------------------------------

const bankCh = createDataTableColumnHelper<BankRow>();
const bankColumns = [
  bankCh.display({
    id: 'account',
    header: 'Account',
    meta: { size: 'fill', grow: 2, phone: 'main' },
    cell: ({ row }) => (
      <NameCell name={row.original.name} last4={row.original.last4} />
    ),
  }),
  bankCh.display({
    id: 'status',
    header: 'Status',
    meta: { size: 'fill', grow: 1, align: 'start', phone: 'status', wrap: true },
    cell: ({ row }) => (
      <div className="flex flex-wrap items-center gap-space-4">
        <Badge tone={row.original.synced ? 'success' : 'neutral'}>
          {row.original.synced ? 'Gmail synced' : 'Manual'}
        </Badge>
        {row.original.gapLabel ? (
          <Badge tone="warning">{row.original.gapLabel}</Badge>
        ) : null}
      </div>
    ),
  }),
  bankCh.display({
    id: 'balance',
    header: 'Balance',
    meta: { size: 'md', align: 'end', phone: 'amount' },
    cell: ({ row }) => (
      <Text variant="body-strong">{row.original.balance}</Text>
    ),
  }),
  bankCh.display({
    id: 'asOf',
    header: 'As of',
    meta: { size: 'md', phone: 'hidden' },
    cell: ({ row }) =>
      row.original.asOf ? (
        <Text variant="body" tone="ink-3">
          {row.original.asOf}
        </Text>
      ) : null,
  }),
  bankCh.display({
    id: 'actions',
    header: '',
    meta: { size: 'md', align: 'end', phone: 'hidden' },
    cell: ({ row }) => (
      <div className="flex items-center justify-end gap-space-4">
        <IconLink
          href={`${rowHref(row.original)}/statements`}
          label="Statements"
          icon="file-text"
        />
        <IconLink
          href={`${rowHref(row.original)}?edit=1`}
          label="Edit"
          icon="pencil-simple"
        />
        <OpenButton row={row.original} />
      </div>
    ),
  }),
];

export function BankSection(props: SectionProps<BankRow>) {
  const router = useRouter();
  return (
    <Card
      title="Bank accounts"
      subtitle="Balances anchor to the latest statement; later transactions are added on top"
      action={
        <AddLink href={`${ACCOUNTS_HREF}?add=bank_account`}>
          Add bank account
        </AddLink>
      }
    >
      <DataTable
        columns={bankColumns}
        data={withClosed(props)}
        getRowId={(row) => row.id}
        onRowSelect={(row) => router.push(rowHref(row))}
        phoneSub={(row) => row.phoneSub}
        rowState={closedState}
        empty={<EmptyState compact description="No bank accounts added." />}
      />
      <ClosedFooter
        line={props.closedLine}
        section="banks"
        showing={props.showClosed}
      />
    </Card>
  );
}

// ---- Credit cards ----------------------------------------------------------

/** A card row whose bill- and rewards-derived pieces arrive later as Suspense-wrapped nodes. */
export interface CardListRow extends CardBaseRow {
  /** The next-bill badge, if the bills have a state to show. */
  billSlot: React.ReactNode;
  /** The Upload button on desktop, shown when the statement is missing. */
  uploadSlot: React.ReactNode;
  /** The Upload statement button on phone. */
  uploadPhoneSlot: React.ReactNode;
  /** The Rewards cell. */
  rewardsSlot: React.ReactNode;
  /** The rewards text at the end of the phone sub line, with its own separator. */
  phoneRewardsSlot: React.ReactNode;
}

/** The Upload button for a card whose statement is missing; rendered by the streamed bill check. */
export function UploadStatementButton({
  id,
  label,
}: {
  id: string;
  label: string;
}) {
  return (
    <Button asChild variant="secondary" size="sm">
      <Link href={uploadHref({ id })}>{label}</Link>
    </Button>
  );
}

function CardBadges({ row }: { row: CardListRow }) {
  return (
    <div className="flex flex-wrap items-center justify-end desk:justify-start gap-space-4">
      {row.billSlot}
      {row.extraBadges.map((badge) => (
        <Badge key={badge.label} tone={badge.tone}>
          {badge.label}
        </Badge>
      ))}
      {row.closing ? (
        <StatusWord tone="neutral">{row.closing}</StatusWord>
      ) : null}
    </div>
  );
}

const cardCh = createDataTableColumnHelper<CardListRow>();
const cardColumns = [
  cardCh.display({
    id: 'card',
    header: 'Card',
    meta: { size: 'fill', grow: 2, phone: 'main', wrap: true },
    cell: ({ row }) => (
      <NameCell
        name={row.original.name}
        last4={row.original.last4}
        sub={row.original.sharedLimit}
      />
    ),
  }),
  cardCh.display({
    id: 'nextBill',
    header: 'Next bill',
    meta: { size: 'md', align: 'start', phone: 'status', wrap: true },
    cell: ({ row }) => <CardBadges row={row.original} />,
  }),
  cardCh.display({
    id: 'outstanding',
    header: 'Outstanding',
    meta: { size: 'md', align: 'end', phone: 'amount' },
    cell: ({ row }) => (
      <Text variant="body-strong">{row.original.outstanding}</Text>
    ),
  }),
  cardCh.display({
    id: 'limitUsed',
    header: 'Limit used',
    meta: { size: 'lg', phone: 'hidden', wrap: true },
    cell: ({ row }) => {
      const used = row.original.limitUsed;
      if (!used)
        return (
          <Text variant="body" tone="ink-3">
            —
          </Text>
        );
      return (
        <div className="flex flex-col gap-space-4 w-full">
          <div className="flex items-center justify-between gap-space-8">
            <Text variant="caption" tone={used.textTone}>
              {used.pctLabel}
            </Text>
            <Text variant="caption" tone="ink-3">
              {used.limitLabel}
            </Text>
          </div>
          <ProgressBar value={Math.min(used.pct, 100)} tone={used.tone} />
        </div>
      );
    },
  }),
  cardCh.display({
    id: 'rewards',
    header: 'Rewards',
    meta: { size: 'md', phone: 'hidden' },
    cell: ({ row }) => row.original.rewardsSlot,
  }),
  cardCh.display({
    id: 'actions',
    header: '',
    meta: { size: 'lg', align: 'end', phone: 'hidden' },
    cell: ({ row }) => (
      <div className="flex items-center justify-end gap-space-4">
        {row.original.uploadSlot}
        <IconLink
          href={`${rowHref(row.original)}/statements`}
          label="Statements"
          icon="file-text"
        />
        <OpenButton row={row.original} />
      </div>
    ),
  }),
];

function cardPhoneSub(row: CardListRow): React.ReactNode {
  const used = row.limitUsed;
  const parts: React.ReactNode[] = [];
  if (row.cardholders > 1) parts.push(`${row.cardholders} cardholders`);
  if (used) {
    parts.push(
      <>
        <Text variant="caption" tone={used.textTone}>
          {used.pctLabel}
        </Text>{' '}
        of {used.limitLabel} used
      </>,
    );
  }
  return (
    <>
      {parts.map((part, i) => (
        <React.Fragment key={i}>
          {i > 0 ? ' · ' : null}
          {part}
        </React.Fragment>
      ))}
      {row.phoneRewardsSlot}
    </>
  );
}

export function CardsSection(
  props: SectionProps<CardListRow> & { subtitle: string }
) {
  const router = useRouter();
  return (
    <Card
      title="Credit cards"
      subtitle={props.subtitle}
      action={
        <div className="flex items-center gap-space-12">
          <AddLink href={`${ACCOUNTS_HREF}?add=credit_card`}>
            Add credit card
          </AddLink>
          <NavLink href="/rewards">Rewards</NavLink>
        </div>
      }
    >
      <DataTable
        columns={cardColumns}
        data={withClosed(props)}
        getRowId={(row) => row.id}
        onRowSelect={(row) => router.push(rowHref(row))}
        phoneSub={cardPhoneSub}
        phoneActions={(row) => row.uploadPhoneSlot}
        rowState={closedState}
        empty={<EmptyState compact description="No credit cards added." />}
      />
      <ClosedFooter
        line={props.closedLine}
        section="cards"
        showing={props.showClosed}
      />
    </Card>
  );
}

// ---- Brokers ---------------------------------------------------------------

const brokerCh = createDataTableColumnHelper<BrokerRow>();
const brokerColumns = [
  brokerCh.display({
    id: 'broker',
    header: 'Broker',
    meta: { size: 'fill', phone: 'main' },
    cell: ({ row }) => <NameCell name={row.original.name} />,
  }),
  brokerCh.display({
    id: 'value',
    header: 'Value',
    meta: { size: 'md', align: 'end', phone: 'amount' },
    cell: ({ row }) => <Text variant="body-strong">{row.original.value}</Text>,
  }),
  brokerCh.display({
    id: 'cash',
    header: 'Cash',
    meta: { size: 'md', align: 'end', phone: 'hidden' },
    cell: ({ row }) => (
      <Text variant="body" tone="ink-3">
        {row.original.cash}
      </Text>
    ),
  }),
];

export function BrokersSection(
  props: SectionProps<BrokerRow> & { title: string }
) {
  const router = useRouter();
  return (
    <Card
      title={props.title}
      subtitle="Holdings value + cash"
      action={
        <div className="flex items-center gap-space-12">
          <AddLink href={`${ACCOUNTS_HREF}?add=broker`}>
            Add broker
          </AddLink>
          <NavLink href="/investments">Investments</NavLink>
        </div>
      }
    >
      <DataTable
        columns={brokerColumns}
        data={withClosed(props)}
        getRowId={(row) => row.id}
        onRowSelect={(row) => router.push(rowHref(row))}
        phoneSub={(row) => row.phoneSub}
        rowState={closedState}
        empty={<EmptyState compact description="No broker accounts added." />}
      />
      <ClosedFooter
        line={props.closedLine}
        section="brokers"
        showing={props.showClosed}
      />
    </Card>
  );
}

// ---- Wallets & cash --------------------------------------------------------

const walletCh = createDataTableColumnHelper<WalletRow>();
const walletColumns = [
  walletCh.display({
    id: 'wallet',
    header: 'Wallet',
    meta: { size: 'fill', phone: 'main', wrap: true },
    cell: ({ row }) => (
      <div className="flex items-baseline gap-space-8 min-w-0">
        <Text variant="body-strong" truncate>
          {row.original.name}
        </Text>
        {row.original.excluded ? (
          <StatusWord tone="neutral">Excluded</StatusWord>
        ) : null}
        {row.original.liability ? (
          <StatusWord tone="neutral">Liability</StatusWord>
        ) : null}
      </div>
    ),
  }),
  walletCh.display({
    id: 'balance',
    header: 'Balance',
    meta: { size: 'md', align: 'end', phone: 'amount' },
    cell: ({ row }) => (
      <Text variant="body-strong">{row.original.balance}</Text>
    ),
  }),
];

export function WalletsSection(props: SectionProps<WalletRow>) {
  const router = useRouter();
  return (
    <Card
      title="Wallets & cash"
      subtitle="Manual balances"
      action={
        <AddLink href={`${ACCOUNTS_HREF}?add=generic`}>Add wallet</AddLink>
      }
    >
      <DataTable
        columns={walletColumns}
        data={withClosed(props)}
        getRowId={(row) => row.id}
        onRowSelect={(row) => router.push(rowHref(row))}
        rowState={closedState}
        empty={<EmptyState compact description="No other accounts added." />}
      />
      <ClosedFooter
        line={props.closedLine}
        section="wallets"
        showing={props.showClosed}
      />
    </Card>
  );
}

// ---- Loading ---------------------------------------------------------------

export function AccountsTablesSkeleton() {
  return (
    <>
      <Card>
        <DataTable
          columns={bankColumns}
          data={[]}
          getRowId={(row) => row.id}
          loading
          skeletonRows={3}
        />
      </Card>
      <Card>
        <DataTable
          columns={cardColumns}
          data={[]}
          getRowId={(row) => row.id}
          loading
          skeletonRows={3}
        />
      </Card>
    </>
  );
}

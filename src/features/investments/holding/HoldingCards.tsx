'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React from 'react';

import {
  Badge,
  Button,
  Card,
  Conceal,
  ConfirmDialog,
  createDataTableColumnHelper,
  DataTable,
  EmptyState,
  ListRow,
  Pager,
  showToast,
  Text,
  TextField,
} from '@/components/ds';
import { appHref } from '@/features/shell/routes';
import { getErrorMessage } from '@/lib/api/errorMessage';
import type { PagePosition, SellEstimate } from '@/lib/investments.types';

import { fyLabel, quantity } from '../investmentsFormat';
import { usePriceMutations } from '../usePriceMutations';
import {
  type CorporateActionRowModel,
  type DividendRowModel,
  type HoldingTab,
  holdingTabHref,
  type InstrumentRow,
  priceDescription,
  type PriceRowModel,
  sellLine,
  type TradeRow,
} from './holdingModel';
import { PriceDialog, type PriceDialogTarget } from './PriceDialog';
import { checkQuantity, quantityStep, sellFigures, taxFreeQuantity } from './sellMath';

/** Where the record flows go until their Dinero dialogs are built: the Legacy pages. */
export const RECORD_TRADE_HREF = appHref('/investments/tradebook');
export const RECORD_DIVIDEND_HREF = appHref('/investments/dividends');
export const RECORD_CORPORATE_ACTION_HREF = appHref('/investments/corporate-actions');
export const EDIT_INSTRUMENT_HREF = appHref('/investments/instruments');

function LinkAction({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <Text variant="label" as="div">
      <Button asChild variant="link" size="sm">
        <Link href={href}>{children}</Link>
      </Button>
    </Text>
  );
}

function SectionPager({ instrumentId, tab, position }: { instrumentId: string; tab: HoldingTab; position: PagePosition }) {
  const router = useRouter();
  return (
    <Pager
      variant="compact"
      page={position.page}
      size={position.size}
      totalElements={position.totalElements}
      totalPages={position.totalPages}
      onPageChange={(page) => router.push(holdingTabHref(instrumentId, tab, page), { scroll: false })}
    />
  );
}

// ---- Trades ------------------------------------------------------------------------

const ch = createDataTableColumnHelper<TradeRow>();

const tradeColumns = [
  ch.display({
    id: 'date',
    header: 'Date',
    meta: { size: 'sm', phone: 'hidden' },
    cell: ({ row }) => <Text variant="body">{row.original.date}</Text>,
  }),
  ch.display({
    id: 'type',
    header: 'Type',
    meta: { size: 'fill', phone: 'main' },
    cell: ({ row }) => (
      <span className="flex items-center gap-space-8 min-w-0">
        <Badge tone={row.original.side === 'Buy' ? 'success' : 'danger'}>{row.original.side}</Badge>
        <Text variant="body" truncate>{row.original.broker}</Text>
      </span>
    ),
  }),
  ch.display({
    id: 'qty',
    header: 'Qty',
    meta: { size: 'sm', align: 'end', phone: 'hidden' },
    cell: ({ row }) => <Text variant="body-strong"><Conceal whole>{row.original.quantity}</Conceal></Text>,
  }),
  ch.display({
    id: 'price',
    header: 'Price',
    meta: { size: 'sm', align: 'end', phone: 'hidden' },
    cell: ({ row }) => <Text variant="body"><Conceal whole>{row.original.pricePlain}</Conceal></Text>,
  }),
  ch.display({
    id: 'value',
    header: 'Value',
    meta: { size: 'md', align: 'end', phone: 'amount' },
    cell: ({ row }) => (
      <span className="flex flex-col items-end">
        <Text variant="body-strong">
          <span className="desk:hidden"><Conceal whole>{row.original.value}</Conceal></span>
          <span className="max-desk:hidden"><Conceal whole>{row.original.valuePlain}</Conceal></span>
        </Text>
        {row.original.pnl ? (
          <Text variant="caption" tone={row.original.pnl.tone} className="max-desk:hidden">
            <Conceal>{row.original.pnl.plain}</Conceal>
          </Text>
        ) : null}
      </span>
    ),
  }),
];

export interface TradesCardProps {
  instrumentId: string;
  tab: HoldingTab;
  rows: TradeRow[];
  position: PagePosition;
  /** "3 lots · FIFO". */
  subtitle?: string;
}

export function TradesCard({ instrumentId, tab, rows, position, subtitle }: TradesCardProps) {
  const showPager = tab === 'trades';
  const pager = showPager ? <SectionPager instrumentId={instrumentId} tab="trades" position={position} /> : undefined;
  return (
    <Card title="Trades" subtitle={subtitle} action={<LinkAction href={RECORD_TRADE_HREF}>Record trade</LinkAction>}>
      <DataTable
        columns={tradeColumns}
        data={rows}
        getRowId={(row) => row.id}
        phoneSub={(row) => <Text variant="label" tone="ink-3" truncate><Conceal>{row.phoneSub}</Conceal></Text>}
        pager={pager}
        empty={<EmptyState compact description="No trades recorded for this holding." />}
        stickyHeader={false}
      />
    </Card>
  );
}

// ---- By broker -----------------------------------------------------------------------

export interface BrokerRowModel {
  id: string;
  name: string;
  sub: string;
  value: string;
}

export function BrokersCard({ rows }: { rows: BrokerRowModel[] }) {
  return (
    <Card title="By broker" subtitle="This stock at each broker">
      {rows.map((r) => (
        <ListRow
          key={r.id}
          title={r.name}
          subtitle={<Conceal>{r.sub}</Conceal>}
          trailing={<Text variant="body-strong"><Conceal>{r.value}</Conceal></Text>}
        />
      ))}
    </Card>
  );
}

// ---- If you sell today ------------------------------------------------------------------

export function SellTodayCard({ estimate, assetType }: { estimate: SellEstimate; assetType: string }) {
  const [text, setText] = React.useState('');
  const unit = assetType === 'mutual_fund' ? 'units' : 'shares';
  const priced = !estimate.noPrice && estimate.price != null;
  const free = React.useMemo(() => taxFreeQuantity(estimate, quantityStep(assetType)), [estimate, assetType]);
  // The whole holding being tax-free is already what the Sell all row says.
  const freeAll = free > 0 && Math.abs(free - estimate.quantity) < 1e-9;
  const typed = text.trim() === '' ? null : checkQuantity(text, estimate.quantity);
  const typedEstimate = typed?.ok ? sellFigures(estimate, typed.quantity) : null;
  return (
    <Card title="If you sell today" subtitle={`Estimates · ${fyLabel(estimate.fy)}`}>
      <ListRow title={`Sell all ${quantity(estimate.quantity)}`} subtitle={<Conceal>{sellLine(estimate)}</Conceal>} wrap />
      {free > 0 && !freeAll ? (
        <ListRow
          title={`Sell up to ${quantity(free)} tax-free`}
          subtitle={<Conceal>{sellLine(sellFigures(estimate, free))}</Conceal>}
          wrap
        />
      ) : null}
      {priced ? (
        <div className="px-space-16 py-space-12 flex flex-col gap-space-8">
          <TextField
            size="md"
            inputMode="decimal"
            placeholder="Quantity"
            value={text}
            onValueChange={setText}
            helper={typed && !typed.ok ? `Up to ${quantity(estimate.quantity)} ${unit}` : undefined}
          />
          {typedEstimate ? (
            <Text variant="caption" tone="ink-3">
              <Conceal>{`Sell ${quantity(typedEstimate.quantity)}: ${sellLine(typedEstimate)}`}</Conceal>
            </Text>
          ) : null}
        </div>
      ) : null}
    </Card>
  );
}

// ---- Dividends and corporate actions ------------------------------------------------------

export function DividendsCard({
  instrumentId,
  tab,
  rows,
  position,
}: {
  instrumentId: string;
  tab: HoldingTab;
  rows: DividendRowModel[];
  position: PagePosition;
}) {
  return (
    <Card title="Dividends" action={<LinkAction href={RECORD_DIVIDEND_HREF}>Record</LinkAction>}>
      {tab === 'dividends' ? <SectionPager instrumentId={instrumentId} tab="dividends" position={position} /> : null}
      {rows.length === 0 ? <EmptyState compact description="No dividends recorded for this holding." /> : null}
      {rows.map((r) => (
        <ListRow
          key={r.id}
          title={r.title}
          subtitle={<Conceal>{r.subtitle}</Conceal>}
          wrap
          trailing={<Text variant="body-strong" tone="positive"><Conceal>{r.amount}</Conceal></Text>}
        />
      ))}
      {tab === 'dividends' && rows.length > 0 ? <SectionPager instrumentId={instrumentId} tab="dividends" position={position} /> : null}
    </Card>
  );
}

export function CorporateActionsCard({ rows }: { rows: CorporateActionRowModel[] }) {
  return (
    <Card title="Corporate actions" subtitle="Recorded for this holding" action={<LinkAction href={RECORD_CORPORATE_ACTION_HREF}>Record</LinkAction>}>
      {rows.length === 0 ? <EmptyState compact description="No corporate actions recorded for this holding." /> : null}
      {rows.map((r) => (
        <ListRow key={r.id} title={r.title} subtitle={r.subtitle} wrap />
      ))}
    </Card>
  );
}

// ---- Instrument ------------------------------------------------------------------------------

export function InstrumentCard({ rows }: { rows: InstrumentRow[] }) {
  return (
    <Card title="Instrument" subtitle="Shared catalog entry" action={<LinkAction href={EDIT_INSTRUMENT_HREF}>Edit</LinkAction>}>
      {rows.map((r) => (
        <ListRow key={r.label} title={r.label} trailing={<Text variant="body">{r.value}</Text>} />
      ))}
    </Card>
  );
}

// ---- Price history ----------------------------------------------------------------------------

export interface PriceHistoryCardProps {
  instrumentId: string;
  name: string;
  tab: HoldingTab;
  rows: PriceRowModel[];
  position: PagePosition;
}

/** The newest prices first. Only the user's own manual prices carry Edit and Delete. */
export function PriceHistoryCard({ instrumentId, name, tab, rows, position }: PriceHistoryCardProps) {
  const router = useRouter();
  const { deletePrice } = usePriceMutations(instrumentId);
  const [editing, setEditing] = React.useState<PriceDialogTarget | null>(null);
  const [deleting, setDeleting] = React.useState<PriceRowModel | null>(null);

  const confirmDelete = async () => {
    const row = deleting;
    if (!row?.id) return;
    try {
      await deletePrice.mutateAsync(row.id);
      showToast('Price entry deleted');
      setDeleting(null);
      router.refresh();
    } catch (e) {
      showToast(getErrorMessage(e, 'Failed to delete the price'), { tone: 'danger' });
    }
  };

  return (
    <>
      <Card title="Price history" subtitle="Newest first · only your manual prices can change">
        {tab === 'prices' ? <SectionPager instrumentId={instrumentId} tab="prices" position={position} /> : null}
        {rows.length === 0 ? <EmptyState compact description="No prices recorded yet." /> : null}
        {rows.map((r) => (
          <ListRow
            key={r.id ?? `${r.asOf}-${r.source}`}
            title={r.date}
            subtitle={r.source}
            trailing={
              <span className="flex items-center gap-space-8">
                <Text variant="body-strong"><Conceal>{r.amount}</Conceal></Text>
                {r.editable ? (
                  <>
                    <Button variant="secondary" size="sm" onClick={() => setEditing({ kind: 'edit', row: r })}>
                      Edit
                    </Button>
                    <Button variant="danger" size="sm" onClick={() => setDeleting(r)}>
                      Delete
                    </Button>
                  </>
                ) : null}
              </span>
            }
          />
        ))}
        {tab === 'prices' && rows.length > 0 ? <SectionPager instrumentId={instrumentId} tab="prices" position={position} /> : null}
      </Card>
      {editing ? <PriceDialog instrumentId={instrumentId} name={name} target={editing} onClose={() => setEditing(null)} /> : null}
      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => {
          if (!open && !deletePrice.isPending) setDeleting(null);
        }}
        title="Delete manual price"
        description={deleting ? `Delete your manual price of ${priceDescription(deleting)}?` : ''}
        impact={['Only this price is deleted.', 'Your trades and the other prices stay.']}
        confirmLabel="Delete price"
        confirmLoading={deletePrice.isPending}
        onConfirm={() => void confirmDelete()}
      />
    </>
  );
}

'use client';

import React from 'react';

import {
  ActionButton,
  Badge,
  Card,
  Conceal,
  createDataTableColumnHelper,
  DataTable,
  EmptyState,
  ListRow,
  Pager,
  Text,
  TextField,
} from '@/components/ds';
import { fyLabel } from '@/features/investments/investmentsFormatModel';
import { formatQuantity } from '@/lib/format';
import type { PagePosition, SellEstimate } from '@/lib/investments.types';

import { loadCorporateActionsPage, loadDividendsPage, loadTradesPage } from './holdingActions';
import {
  type CorporateActionRowModel,
  type DividendRowModel,
  type HoldingSection,
  type InstrumentRow,
  sellLine,
  type TradeRow,
} from './holdingModel';
import { checkQuantity, quantityStep, sanitizeQuantityInput, sellFigures, taxFreeQuantity } from './sellMathModel';
import { useSectionPage } from './useSectionPage';

function SectionPager({ position, onPageChange }: { position: PagePosition; onPageChange: (page: number) => void }) {
  return (
    <Pager
      variant="compact"
      page={position.page}
      size={position.size}
      totalElements={position.totalElements}
      totalPages={position.totalPages}
      onPageChange={onPageChange}
    />
  );
}

// ---- Trades ------------------------------------------------------------------------

const ch = createDataTableColumnHelper<TradeRow>();

const tradeColumns = [
  ch.display({
    id: 'date',
    header: 'Date',
    meta: { size: 'date', phone: 'hidden' },
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
  /** The first page, as the server rendered it. */
  initial: HoldingSection<TradeRow>;
  /** "3 lots · FIFO". */
  subtitle?: string;
  onRecord: () => void;
}

export function TradesCard({ instrumentId, initial, subtitle, onRecord }: TradesCardProps) {
  const { section, goTo } = useSectionPage(initial, (page) => loadTradesPage(instrumentId, page));
  return (
    <Card title="Trades" subtitle={subtitle} action={<Text variant="label" as="div"><ActionButton variant="link" size="sm" onSelect={onRecord}>Record trade</ActionButton></Text>}>
      <DataTable
        columns={tradeColumns}
        data={section.rows}
        getRowId={(row) => row.id}
        phoneSub={(row) => <Text variant="label" tone="ink-3" truncate><Conceal>{row.phoneSub}</Conceal></Text>}
        pager={<SectionPager position={section.position} onPageChange={(page) => void goTo(page)} />}
        empty={<EmptyState compact description="No trades yet" />}
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
      <ListRow title={`Sell all ${formatQuantity(estimate.quantity)}`} subtitle={<Conceal>{sellLine(estimate)}</Conceal>} wrap />
      {free > 0 && !freeAll ? (
        <ListRow
          title={`Sell up to ${formatQuantity(free)} tax-free`}
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
            onValueChange={(v) => setText(sanitizeQuantityInput(v, assetType))}
            helper={typed && !typed.ok ? `Up to ${formatQuantity(estimate.quantity)} ${unit}.` : undefined}
          />
          {typedEstimate ? (
            <Text variant="caption" tone="ink-3">
              <Conceal>{`Sell ${formatQuantity(typedEstimate.quantity)}: ${sellLine(typedEstimate)}`}</Conceal>
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
  initial,
  onRecord,
}: {
  instrumentId: string;
  initial: HoldingSection<DividendRowModel>;
  onRecord: () => void;
}) {
  const { section, goTo } = useSectionPage(initial, (page) => loadDividendsPage(instrumentId, page));
  const pager = <SectionPager position={section.position} onPageChange={(page) => void goTo(page)} />;
  return (
    <Card title="Dividends" action={<Text variant="label" as="div"><ActionButton variant="link" size="sm" onSelect={onRecord}>Record</ActionButton></Text>}>
      {section.rows.length > 0 ? pager : null}
      {section.rows.length === 0 ? <EmptyState compact description="No dividends yet" /> : null}
      {section.rows.map((r) => (
        <ListRow
          key={r.id}
          title={r.title}
          subtitle={<Conceal>{r.subtitle}</Conceal>}
          wrap
          trailing={<Text variant="body-strong" tone="positive"><Conceal>{r.amount}</Conceal></Text>}
        />
      ))}
      {section.rows.length > 0 ? pager : null}
    </Card>
  );
}

export function CorporateActionsCard({
  instrumentId,
  initial,
  onRecord,
}: {
  instrumentId: string;
  initial: HoldingSection<CorporateActionRowModel>;
  onRecord: () => void;
}) {
  const { section, goTo } = useSectionPage(initial, (page) => loadCorporateActionsPage(instrumentId, page));
  const pager = <SectionPager position={section.position} onPageChange={(page) => void goTo(page)} />;
  return (
    <Card title="Corporate actions" subtitle="Recorded for this holding" action={<Text variant="label" as="div"><ActionButton variant="link" size="sm" onSelect={onRecord}>Record</ActionButton></Text>}>
      {section.rows.length > 0 ? pager : null}
      {section.rows.length === 0 ? <EmptyState compact description="No corporate actions yet" /> : null}
      {section.rows.map((r) => (
        <ListRow key={r.id} title={r.title} subtitle={r.subtitle} wrap />
      ))}
      {section.rows.length > 0 ? pager : null}
    </Card>
  );
}

// ---- Instrument ------------------------------------------------------------------------------

export function InstrumentCard({ rows }: { rows: InstrumentRow[] }) {
  return (
    <Card title="Instrument" subtitle="Shared catalog entry">
      {rows.map((r) => (
        <ListRow key={r.label} title={r.label} trailing={<Text variant="body">{r.value}</Text>} />
      ))}
    </Card>
  );
}

'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import React from 'react';

import { type TabItem, Tabs } from '@/components/ds';
import { CorporateActionDialog } from '@/features/investments/corporate-actions/CorporateActionDialog';
import { DividendAddDialog } from '@/features/investments/dividends/DividendFormDialog';
import { InstrumentEditDialog } from '@/features/investments/instruments/InstrumentEditDialog';
import { ResetInstrumentDialog } from '@/features/investments/instruments/ResetInstrumentDialog';
import { holdingHref, HOLDINGS_HREF } from '@/features/investments/investmentsTabs';
import { RecordTradeDialog } from '@/features/investments/tradebook/TradeDialog';
import { ShellPage } from '@/features/shell/ShellPage';

import { quantity, rupees, unitPrice } from '../investmentsFormat';
import {
  type BrokerRowModel,
  BrokersCard,
  CorporateActionsCard,
  DividendsCard,
  InstrumentCard,
  PriceHistoryCard,
  SellTodayCard,
  TradesCard,
} from './HoldingCards';
import type { HoldingPageData } from './holdingData';
import { HoldingFigures } from './HoldingFigures';
import {
  corporateActionRow,
  dividendRow,
  HOLDING_TABS,
  holdingFigures,
  holdingHeader,
  holdingHero,
  type HoldingTab,
  holdingTabHref,
  instrumentRows,
  priceRow,
  tradeRow,
} from './holdingModel';
import { PriceChartCard } from './PriceChartCard';
import { PriceDialog } from './PriceDialog';

export interface HoldingViewProps {
  data: HoldingPageData;
  tab: HoldingTab;
  /** Today's calendar date in the app zone (YYYY-MM-DD), the default date of a manual price. */
  today: string;
  /** The server's clock (ISO), so Live/Close wording matches the render; defaults to now. */
  now?: string;
}

type HoldingDialog = 'trade' | 'dividend' | 'corporate-action' | 'edit-instrument' | 'reset-instrument';

const EMPTY_POSITION = { page: 0, size: 1, totalElements: 0, totalPages: 0 };

/** One holding: its figures, then (Overview) every section or (a tab) that section's full list. */
export function HoldingView({ data, tab, today, now }: HoldingViewProps) {
  const { holding, instrument, estimate, trades, dividends, corporateActions, prices, history } = data;
  const router = useRouter();
  const [overriding, setOverriding] = React.useState(false);
  const [dialog, setDialog] = React.useState<HoldingDialog | null>(null);
  const closeDialog = () => setDialog(null);

  const header = holdingHeader(holding, instrument);
  const tradeRows = (trades?.content ?? []).map(tradeRow);
  const tradePosition = trades
    ? { page: trades.number, size: trades.size, totalElements: trades.totalElements, totalPages: trades.totalPages }
    : EMPTY_POSITION;
  const dividendRows = (dividends?.content ?? []).map(dividendRow);
  const dividendPosition = dividends
    ? { page: dividends.number, size: dividends.size, totalElements: dividends.totalElements, totalPages: dividends.totalPages }
    : EMPTY_POSITION;
  const actionRows = (corporateActions ?? []).map(corporateActionRow);
  const priceRows = (prices?.items ?? []).map(priceRow);
  const pricePosition = prices
    ? { page: prices.page, size: prices.size, totalElements: prices.totalElements, totalPages: prices.totalPages }
    : EMPTY_POSITION;
  const brokerRows: BrokerRowModel[] = holding.brokers.map((b) => ({
    id: b.brokerAccountId,
    name: b.accountName,
    sub: `${quantity(b.quantity)} ${holding.assetType === 'mutual_fund' ? 'units' : 'shares'} · avg ${unitPrice(b.avgCost)}`,
    value: rupees(b.currentValue),
  }));
  const lots = estimate ? estimate.lots.length : 0;
  const tradesSubtitle = estimate && lots > 0 ? `${lots} ${lots === 1 ? 'lot' : 'lots'} · FIFO` : undefined;

  const counts: Partial<Record<HoldingTab, number>> = {
    trades: tradePosition.totalElements,
    dividends: dividendPosition.totalElements,
    'corporate-actions': actionRows.length,
  };
  const items: TabItem[] = HOLDING_TABS.map((t) => ({
    value: t.id,
    label: t.label,
    count: counts[t.id],
    asChild: true,
    children: <Link href={holdingTabHref(holding.instrumentId, t.id)} />,
  }));

  const id = holding.instrumentId;
  const ref = { id, name: holding.name, symbol: holding.symbol };
  const trades_ = (
    <TradesCard
      instrumentId={id}
      tab={tab}
      rows={tradeRows}
      position={tradePosition}
      subtitle={tradesSubtitle}
      onRecord={() => setDialog('trade')}
    />
  );
  const dividends_ = <DividendsCard
      instrumentId={id}
      tab={tab}
      rows={dividendRows}
      position={dividendPosition}
      onRecord={() => setDialog('dividend')}
    />;
  const actions_ = <CorporateActionsCard rows={actionRows} onRecord={() => setDialog('corporate-action')} />;
  const prices_ = <PriceHistoryCard instrumentId={id} name={holding.name} tab={tab} rows={priceRows} position={pricePosition} />;

  return (
    <>
      <ShellPage crumb="Grow / Investments" title={header.title} backHref={HOLDINGS_HREF} flushTop onAdd={() => setDialog('trade')}>
        <div className="flex flex-col gap-space-12 desk:gap-space-16">
          <Tabs items={items} value={tab} />
          {tab === 'overview' ? (
            <>
              <HoldingFigures
                header={header}
                hero={holdingHero(holding)}
                figures={holdingFigures(holding, instrument, tradePosition.totalElements, now ? new Date(now) : new Date())}
                onOverride={() => setOverriding(true)}
                onRecordDividend={() => setDialog('dividend')}
                onRecordCorporateAction={() => setDialog('corporate-action')}
              />
              <div className="grid grid-cols-1 desk:grid-cols-12 items-start gap-space-12 desk:gap-space-16">
                <div className="desk:col-span-8 flex flex-col gap-space-12 desk:gap-space-16 min-w-0">
                  {history ? <PriceChartCard history={history} /> : null}
                  {prices_}
                  {trades_}
                  {brokerRows.length > 0 ? <BrokersCard rows={brokerRows} /> : null}
                  {estimate ? <SellTodayCard estimate={estimate} assetType={holding.assetType} /> : null}
                </div>
                <div className="desk:col-span-4 flex flex-col gap-space-12 desk:gap-space-16 min-w-0">
                  {dividends_}
                  {actions_}
                  {instrument ? <InstrumentCard rows={instrumentRows(instrument)} onEdit={() => setDialog('edit-instrument')} /> : null}
                </div>
              </div>
            </>
          ) : null}
          {tab === 'trades' ? trades_ : null}
          {tab === 'dividends' ? dividends_ : null}
          {tab === 'corporate-actions' ? actions_ : null}
          {tab === 'prices' ? prices_ : null}
        </div>
      </ShellPage>
      {dialog === 'trade' ? (
        <RecordTradeDialog
          initialInstrument={ref}
          initialBrokerAccountId={holding.brokers.length === 1 ? holding.brokers[0].brokerAccountId : undefined}
          onClose={closeDialog}
        />
      ) : null}
      {dialog === 'dividend' ? (
        <DividendAddDialog
          prefill={{ instrumentId: id, brokerAccountId: holding.brokers[0]?.brokerAccountId }}
          onClose={closeDialog}
        />
      ) : null}
      {dialog === 'corporate-action' ? <CorporateActionDialog instrument={ref} onClose={closeDialog} /> : null}
      {dialog === 'edit-instrument' && instrument ? (
        <InstrumentEditDialog
          instrument={instrument}
          onClose={closeDialog}
          onReset={() => setDialog('reset-instrument')}
          onSaved={({ instrument: saved, moved, merged }) =>
            // An identifier edit can move the holdings to another instrument: this address is then gone.
            moved || merged ? router.replace(holdingHref(saved.id)) : router.refresh()
          }
        />
      ) : null}
      {dialog === 'reset-instrument' && instrument ? <ResetInstrumentDialog instrument={instrument} onClose={closeDialog} /> : null}
      {overriding ? (
        <PriceDialog
          instrumentId={id}
          name={holding.name}
          target={{ kind: 'override', today, price: holding.manualPrice ? holding.ltp : null }}
          onClose={() => setOverriding(false)}
        />
      ) : null}
    </>
  );
}

'use client';

import Link from 'next/link';
import React from 'react';

import { type TabItem, Tabs } from '@/components/ds';
import { HOLDINGS_HREF } from '@/features/investments/investmentsTabs';
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
}

const EMPTY_POSITION = { page: 0, size: 1, totalElements: 0, totalPages: 0 };

/** One holding: its figures, then (Overview) every section or (a tab) that section's full list. */
export function HoldingView({ data, tab, today }: HoldingViewProps) {
  const { holding, instrument, estimate, trades, dividends, corporateActions, prices, history } = data;
  const [overriding, setOverriding] = React.useState(false);

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
  const trades_ = (
    <TradesCard instrumentId={id} tab={tab} rows={tradeRows} position={tradePosition} subtitle={tradesSubtitle} />
  );
  const dividends_ = <DividendsCard instrumentId={id} tab={tab} rows={dividendRows} position={dividendPosition} />;
  const actions_ = <CorporateActionsCard rows={actionRows} />;
  const prices_ = <PriceHistoryCard instrumentId={id} name={holding.name} tab={tab} rows={priceRows} position={pricePosition} />;

  return (
    <>
      <ShellPage crumb="Grow / Investments" title={header.title} backHref={HOLDINGS_HREF} flushTop>
        <div className="flex flex-col gap-space-12 desk:gap-space-16">
          <Tabs items={items} value={tab} />
          {tab === 'overview' ? (
            <>
              <HoldingFigures
                header={header}
                hero={holdingHero(holding)}
                figures={holdingFigures(holding, instrument, tradePosition.totalElements)}
                onOverride={() => setOverriding(true)}
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
                  {instrument ? <InstrumentCard rows={instrumentRows(instrument)} /> : null}
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

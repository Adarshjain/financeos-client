'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

import type { TopBarMenuItem } from '@/components/ds';
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
  SellTodayCard,
  TradesCard,
} from './HoldingCards';
import type { HoldingPageData } from './holdingData';
import { HoldingFigures } from './HoldingFigures';
import {
  holdingFigures,
  holdingHeader,
  holdingHero,
  instrumentRows,
} from './holdingModel';
import { PriceChartCard } from './PriceChartCard';
import { PriceDialog } from './PriceDialog';
import { PriceHistoryDialog } from './PriceHistoryDialog';

export interface HoldingViewProps {
  data: HoldingPageData;
  /** Today's calendar date in the app zone (YYYY-MM-DD), the default date of a manual price. */
  today: string;
  /** The server's clock (ISO), so Live/Close wording matches the render; defaults to now. */
  now?: string;
}

type HoldingDialog = 'trade' | 'dividend' | 'corporate-action' | 'price-history' | 'edit-instrument' | 'reset-instrument';

const EMPTY_SECTION = { rows: [], position: { page: 0, size: 1, totalElements: 0, totalPages: 0 } };

/** One holding: its figures, then every section; each list pages on its own. */
export function HoldingView({ data, today, now }: HoldingViewProps) {
  const { holding, instrument, estimate, trades, dividends, corporateActions, splits, history } = data;
  const router = useRouter();
  const [overriding, setOverriding] = React.useState(false);
  const [dialog, setDialog] = React.useState<HoldingDialog | null>(null);
  const closeDialog = () => setDialog(null);

  const header = holdingHeader(holding);
  const brokerRows: BrokerRowModel[] = holding.brokers.map((b) => ({
    id: b.brokerAccountId,
    name: b.accountName,
    sub: `${quantity(b.quantity)} ${holding.assetType === 'mutual_fund' ? 'units' : 'shares'} · avg ${unitPrice(b.avgCost)}`,
    value: rupees(b.currentValue),
  }));
  const lots = estimate ? estimate.lots.length : 0;
  const tradesSubtitle = estimate && lots > 0 ? `${lots} ${lots === 1 ? 'lot' : 'lots'} · FIFO` : undefined;

  const id = holding.instrumentId;
  const ref = { id, name: holding.name, symbol: holding.symbol };
  const addMenu: TopBarMenuItem[] = [
    { id: 'trade', label: 'Record trade', onSelect: () => setDialog('trade') },
    { id: 'dividend', label: 'Record dividend', onSelect: () => setDialog('dividend') },
    { id: 'corporate-action', label: 'Record corporate action', onSelect: () => setDialog('corporate-action') },
    { id: 'price', label: 'Record price', onSelect: () => setOverriding(true) },
  ];

  return (
    <>
      <ShellPage crumb="Grow / Investments" title={header.title} backHref={HOLDINGS_HREF} addMenu={addMenu}>
        <div className="flex flex-col gap-space-8 desk:gap-space-16">
          <HoldingFigures
            hero={holdingHero(holding)}
            figures={holdingFigures(holding, instrument, trades?.position.totalElements ?? 0, now ? new Date(now) : new Date())}
            onOverride={() => setOverriding(true)}
          />
          <div className="grid grid-cols-1 desk:grid-cols-12 items-start gap-x-space-12 gap-y-space-8 desk:gap-space-16">
            <div className="desk:col-span-8 flex flex-col gap-space-8 desk:gap-space-16 min-w-0">
              <PriceChartCard history={history} splits={splits} onOpenHistory={() => setDialog('price-history')} />
              <TradesCard instrumentId={id} initial={trades ?? EMPTY_SECTION} subtitle={tradesSubtitle} onRecord={() => setDialog('trade')} />
              {brokerRows.length > 0 ? <BrokersCard rows={brokerRows} /> : null}
              {estimate ? <SellTodayCard estimate={estimate} assetType={holding.assetType} /> : null}
            </div>
            <div className="desk:col-span-4 flex flex-col gap-space-8 desk:gap-space-16 min-w-0">
              <DividendsCard instrumentId={id} initial={dividends ?? EMPTY_SECTION} onRecord={() => setDialog('dividend')} />
              <CorporateActionsCard instrumentId={id} initial={corporateActions ?? EMPTY_SECTION} onRecord={() => setDialog('corporate-action')} />
              {instrument ? <InstrumentCard rows={instrumentRows(instrument)} onEdit={() => setDialog('edit-instrument')} /> : null}
            </div>
          </div>
        </div>
      </ShellPage>
      {dialog === 'price-history' ? <PriceHistoryDialog instrumentId={id} name={holding.name} onClose={closeDialog} /> : null}
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

'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

import { ActionBar } from '@/components/ds/ActionBar/ActionBar';
import { Button } from '@/components/ds/Button/Button';
import { GRID_GAP } from '@/components/ds/gridGap';
import { Menu } from '@/components/ds/Menu/Menu';
import { holdingHref, HOLDINGS_HREF } from '@/features/investments/investmentsTabs';
import {
  loadCorporateActionDialog,
  loadDividendAddDialog,
  loadInstrumentEditDialog,
  loadRecordTradeDialog,
  loadResetInstrumentDialog,
} from '@/features/investments/lazyDialogs';
import { subCrumb } from '@/features/shell/navigation';
import { ShellPage } from '@/features/shell/ShellPage';
import { formatMoney, formatQuantity } from '@/lib/format';
import { useLazyDialog } from '@/lib/lazy/useLazyDialog';

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
import { HoldingHero, PositionCard } from './HoldingFigures';
import {
  holdingFigures,
  holdingHeader,
  holdingHero,
  instrumentRows,
} from './holdingModel';
import { PriceChartCard } from './PriceChartCard';

export interface HoldingScreenProps {
  data: HoldingPageData;
  /** Today's calendar date in the app zone (YYYY-MM-DD), the default date of a manual price. */
  today: string;
  /** The server's clock (ISO), so Live/Close wording matches the render; defaults to now. */
  now?: string;
}

// Each dialog is not in the page: it loads when the user opens it (see useLazyDialog).
const loadPriceHistoryDialog = () => import('./PriceHistoryDialog').then((m) => m.PriceHistoryDialog);
const loadPriceDialog = () => import('./PriceDialog').then((m) => m.PriceDialog);

type HoldingDialog = 'trade' | 'dividend' | 'corporate-action' | 'price-history' | 'edit-instrument' | 'reset-instrument';

const ASSET_WORDS: Record<string, string> = { stock: 'Stock', mutual_fund: 'Mutual fund', etf: 'ETF' };

const EMPTY_SECTION = { rows: [], position: { page: 0, size: 1, totalElements: 0, totalPages: 0 } };

/** One holding: its figures, then every section; each list pages on its own. */
export function HoldingScreen({ data, today, now }: HoldingScreenProps) {
  const { holding, instrument, estimate, trades, dividends, corporateActions, splits, history } = data;
  const router = useRouter();
  const [overriding, setOverriding] = React.useState(false);
  const [dialog, setDialog] = React.useState<HoldingDialog | null>(null);
  const closeDialog = () => setDialog(null);
  const trade = useLazyDialog(loadRecordTradeDialog);
  const dividend = useLazyDialog(loadDividendAddDialog);
  const corporateAction = useLazyDialog(loadCorporateActionDialog);
  const editInstrument = useLazyDialog(loadInstrumentEditDialog);
  const resetInstrument = useLazyDialog(loadResetInstrumentDialog);
  const priceHistory = useLazyDialog(loadPriceHistoryDialog);
  const price = useLazyDialog(loadPriceDialog);
  const lazyOf = { trade, dividend, 'corporate-action': corporateAction, 'edit-instrument': editInstrument, 'reset-instrument': resetInstrument, 'price-history': priceHistory };
  /** Opens a dialog once its code is ready; the pressed control shows loading meanwhile. */
  const openDialog = (kind: HoldingDialog) => void lazyOf[kind].run(() => setDialog(kind));
  const openPrice = () => void price.run(() => setOverriding(true));

  const header = holdingHeader(holding);
  const brokerRows: BrokerRowModel[] = holding.brokers.map((b) => ({
    id: b.brokerAccountId,
    name: b.accountName,
    sub: `${formatQuantity(b.quantity)} ${holding.assetType === 'mutual_fund' ? 'units' : 'shares'} · avg ${formatMoney(b.avgCost, { decimals: 'exact' })}`,
    value: formatMoney(b.currentValue),
  }));
  const lots = estimate ? estimate.lots.length : 0;
  const tradesSubtitle = estimate && lots > 0 ? `${lots} ${lots === 1 ? 'lot' : 'lots'} · FIFO` : undefined;

  const id = holding.instrumentId;
  const ref = { id, name: holding.name, symbol: holding.symbol };
  const figures = holdingFigures(holding, instrument, now ? new Date(now) : new Date());
  const facts = [
    ASSET_WORDS[holding.assetType] ?? 'Holding',
    instrument?.exchange,
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <>
      <ShellPage crumb={subCrumb('investments')} title={header.title} backHref={HOLDINGS_HREF}>
        <div className="flex flex-col gap-space-8 desk:gap-space-16">
          <HoldingHero hero={holdingHero(holding)} figures={figures} />
          <ActionBar
            info={facts}
            actions={
              <Button variant="secondary" loading={trade.loading} onPointerDown={trade.preload} onClick={() => openDialog('trade')}>
                Record trade
              </Button>
            }
            menu={
              <>
                <Menu.Item onSelect={() => openDialog('dividend')}>Record dividend</Menu.Item>
                <Menu.Item onSelect={() => openDialog('corporate-action')}>Record corporate action</Menu.Item>
                <Menu.Item onSelect={openPrice}>Record price</Menu.Item>
                {instrument ? <Menu.Item onSelect={() => openDialog('edit-instrument')}>Edit instrument</Menu.Item> : null}
              </>
            }
          />
          <PositionCard figures={figures} onOverride={openPrice} />
          <div className={`grid grid-cols-1 desk:grid-cols-12 items-start ${GRID_GAP}`}>
            <div className="desk:col-span-8 flex flex-col gap-space-8 desk:gap-space-16 min-w-0">
              <PriceChartCard history={history} splits={splits} onOpenHistory={() => openDialog('price-history')} />
              <TradesCard instrumentId={id} initial={trades ?? EMPTY_SECTION} subtitle={tradesSubtitle} onRecord={() => openDialog('trade')} />
              {brokerRows.length > 0 ? <BrokersCard rows={brokerRows} /> : null}
              {estimate ? <SellTodayCard estimate={estimate} assetType={holding.assetType} /> : null}
            </div>
            <div className="desk:col-span-4 flex flex-col gap-space-8 desk:gap-space-16 min-w-0">
              <DividendsCard instrumentId={id} initial={dividends ?? EMPTY_SECTION} onRecord={() => openDialog('dividend')} />
              <CorporateActionsCard instrumentId={id} initial={corporateActions ?? EMPTY_SECTION} onRecord={() => openDialog('corporate-action')} />
              {instrument ? <InstrumentCard rows={instrumentRows(instrument)} /> : null}
            </div>
          </div>
        </div>
      </ShellPage>
      {dialog === 'price-history' && priceHistory.Component ? <priceHistory.Component instrumentId={id} name={holding.name} onClose={closeDialog} /> : null}
      {dialog === 'trade' && trade.Component ? (
        <trade.Component
          initialInstrument={ref}
          initialBrokerAccountId={holding.brokers.length === 1 ? holding.brokers[0].brokerAccountId : undefined}
          onClose={closeDialog}
        />
      ) : null}
      {dialog === 'dividend' && dividend.Component ? (
        <dividend.Component
          prefill={{ instrumentId: id, brokerAccountId: holding.brokers[0]?.brokerAccountId }}
          onClose={closeDialog}
        />
      ) : null}
      {dialog === 'corporate-action' && corporateAction.Component ? <corporateAction.Component instrument={ref} onClose={closeDialog} /> : null}
      {dialog === 'edit-instrument' && instrument && editInstrument.Component ? (
        <editInstrument.Component
          instrument={instrument}
          onClose={closeDialog}
          onReset={() => openDialog('reset-instrument')}
          onSaved={({ instrument: saved, moved, merged }) =>
            // An identifier edit can move the holdings to another instrument: this address is then gone.
            moved || merged ? router.replace(holdingHref(saved.id)) : router.refresh()
          }
        />
      ) : null}
      {dialog === 'reset-instrument' && instrument && resetInstrument.Component ? <resetInstrument.Component instrument={instrument} onClose={closeDialog} /> : null}
      {overriding && price.Component ? (
        <price.Component
          instrumentId={id}
          name={holding.name}
          target={{ kind: 'override', today, price: holding.manualPrice ? holding.ltp : null }}
          onClose={() => setOverriding(false)}
        />
      ) : null}
    </>
  );
}

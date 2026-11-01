// The Add widget picker's sample content, one small mock-up per built-in, drawn from the Dinero components with
// hard-coded sample data (nothing is fetched). It follows Legacy's previews, so what the picker promises is what
// the widget shows. A key without one gets WidgetPreview's placeholder.

import type { ComponentType, ReactNode } from 'react';

import { Badge } from '@/components/ds/Badge/Badge';
import { Button } from '@/components/ds/Button/Button';
import { ListRow } from '@/components/ds/ListRow/ListRow';
import { ProgressBar } from '@/components/ds/ProgressBar/ProgressBar';
import { StatusWords } from '@/components/ds/StatusWords/StatusWords';
import { Text } from '@/components/ds/Text/Text';
import type { ChartInput } from '@/components/organisms/Chart/Chart';
import { formatDate, formatMoney, formatPercent } from '@/lib/format';
import { LazyChart as Chart } from '@/lib/lazy/LazyChart';

type Tone = 'brand' | 'warning' | 'danger';

function Stack({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-space-8">{children}</div>;
}

/** A label with its figure on the right and an optional bar under it. */
function Line({ label, value, valueTone, pct, tone }: { label: ReactNode; value: ReactNode; valueTone?: 'positive'; pct?: number; tone?: Tone }) {
  return (
    <div className="flex flex-col gap-space-4">
      <ListRow flush title={label} trailing={<Text variant="body-strong" tone={valueTone}>{value}</Text>} />
      {pct !== undefined ? <ProgressBar value={pct} tone={tone} /> : null}
    </div>
  );
}

/** A stand-in for a row action ("Mark paid"): drawn, never pressed. */
function Action({ children }: { children: ReactNode }) {
  return (
    <Button size="sm" tabIndex={-1}>
      {children}
    </Button>
  );
}

const DAY_MS = 86_400_000;

/** 12 weeks of daily spend, fixed in shape (only the dates follow today) so the preview never changes. */
export function sampleHeatmap(now: Date = new Date()): ChartInput {
  const days = Array.from({ length: 84 }, (_, i) => {
    const level = (i * 7 + (i % 5) * 3 + (i % 3)) % 5;
    return { date: new Date(now.getTime() - i * DAY_MS).toISOString().slice(0, 10), spend: level * 900 + (level > 0 ? 250 : 0) };
  }).reverse();
  return { chartType: 'heatmap', categories: days.map((d) => d.date), series: [{ name: 'Spend', data: days.map((d) => d.spend) }] } as unknown as ChartInput;
}

const TREND = [22, 20, 21, 16, 17, 12, 14, 9, 10, 6, 4].map((v) => 30 - v);

function NetWorth() {
  return (
    <Stack>
      <Text variant="figure">{formatMoney(4862300)}</Text>
      <Text variant="caption" tone="positive">{`+${formatMoney(124500)} vs last month`}</Text>
    </Stack>
  );
}

function Attention() {
  const rows: Array<[string, string]> = [
    [`HDFC Regalia bill ${formatMoney(18240)} due in 2 days`, 'Mark paid'],
    [`Home loan EMI ${formatMoney(32500)} due tomorrow`, 'Record'],
    ['12 transactions waiting for review', 'Review'],
  ];
  return (
    <Stack>
      {rows.map(([text, action]) => (
        <ListRow key={text} flush title={text} trailing={<Action>{action}</Action>} />
      ))}
    </Stack>
  );
}

function Upcoming() {
  const rows: Array<[string, string, number]> = [
    ['2026-10-11', 'ICICI Amazon Pay bill', 6410],
    ['2026-10-12', 'Car loan EMI', 14200],
    ['2026-10-15', 'Rahul returns', 5000],
  ];
  return (
    <Stack>
      {rows.map(([date, title, amount]) => (
        <ListRow key={title} flush title={title} subtitle={formatDate(date, 'list')} trailing={<Text variant="body-strong">{formatMoney(amount)}</Text>} />
      ))}
    </Stack>
  );
}

function BillsDue() {
  return (
    <Stack>
      <ListRow flush title="HDFC Regalia · Statement" subtitle={`${formatMoney(18240)} due ${formatDate('2026-10-14', 'list')}`} trailing={<Action>Mark paid</Action>} />
      <ListRow flush title="SBI Cashback · Unbilled" subtitle={`${formatMoney(4120)} so far this cycle`} />
    </Stack>
  );
}

function CardUtilisation() {
  return (
    <Stack>
      <Line label="SBI Cashback" value={formatPercent(12, { fixed: true })} pct={12} />
      <Line label="HDFC Regalia" value={formatPercent(46, { fixed: true })} pct={46} />
      <Line label="ICICI Amazon Pay" value={formatPercent(78, { fixed: true })} pct={78} tone="warning" />
    </Stack>
  );
}

function MilestoneProgress() {
  return (
    <Stack>
      <Line label={`Axis Atlas · ${formatMoney(300000)} milestone`} value={formatPercent(54, { decimals: 0 })} pct={54} />
      <Text variant="caption" tone="ink-3">{`${formatMoney(162000)} spent · 41 days left · ${formatMoney(3366)} a day to reach it`}</Text>
    </Stack>
  );
}

function CapHeadroom() {
  return (
    <Stack>
      <Line label="SBI Cashback · Online 5%" value={`${formatMoney(4600)} of ${formatMoney(5000)}`} pct={92} tone="danger" />
      <Line label="HDFC Millennia · Amazon" value={`${formatMoney(600)} of ${formatMoney(1000)}`} pct={60} />
    </Stack>
  );
}

function PortfolioSnapshot() {
  return (
    <Stack>
      <Text variant="figure">{formatMoney(1248600)}</Text>
      <Text variant="caption" tone="positive">{`+${formatMoney(8420)} (+0.68%) since the last price update`}</Text>
      <Line label="Invested" value={formatMoney(1020000)} />
      <Line label="Unrealised gain" value={`+${formatMoney(228600)}`} valueTone="positive" />
      <Line label="XIRR" value={formatPercent(14.2)} />
    </Stack>
  );
}

function TopMovers() {
  const rows: Array<[string, number]> = [
    ['Tata Motors', 3.4],
    ['HDFC Bank', 1.9],
    ['Infosys', -2.1],
  ];
  return (
    <Stack>
      {rows.map(([name, pct]) => (
        <ListRow
          key={name}
          flush
          title={name}
          trailing={
            <Text variant="body-strong" tone={pct > 0 ? 'positive' : 'danger'}>
              {formatPercent(pct, { sign: 'always' })}
            </Text>
          }
        />
      ))}
    </Stack>
  );
}

function Allocation() {
  const segments = [
    { value: 64, label: 'Equity', color: 'chart-1' },
    { value: 21, label: 'Debt', color: 'chart-2' },
    { value: 7, label: 'Hybrid', color: 'chart-3' },
    { value: 5, label: 'Gold', color: 'chart-4' },
    { value: 3, label: 'International', color: 'chart-5' },
  ] as const;
  return (
    <Stack>
      <ProgressBar segments={[...segments]} />
      <ProgressBar.Legend items={segments.map((s) => ({ label: `${s.label} ${s.value}%`, color: s.color }))} />
    </Stack>
  );
}

function TaxHarvest() {
  return (
    <Stack>
      <Line label="LTCG booked this FY" value={formatMoney(48000)} pct={38} />
      <Text variant="caption" tone="ink-3">{`${formatMoney(77000)} of the ${formatMoney(125000)} exemption left`}</Text>
      <ListRow flush title={`Nifty 50 ETF · +${formatMoney(31200)}`} trailing={<Badge tone="success">Worth selling</Badge>} />
    </Stack>
  );
}

function SpendHeatmap() {
  return (
    <Stack>
      <Chart money months={3} data={sampleHeatmap()} />
      <Text variant="caption" tone="ink-3">Darker days spent more</Text>
    </Stack>
  );
}

function LoanPayoff() {
  return (
    <Stack>
      <Line label="Home loan · left" value={formatMoney(3840000)} pct={31} />
      <Text variant="caption" tone="ink-3">{`31% of principal repaid · paid off by ${formatDate('2041-03-05', 'input')} · ${formatMoney(2160000)} interest to go`}</Text>
    </Stack>
  );
}

function LendingBalances() {
  return (
    <Stack>
      <ListRow flush title="Rahul owes you" trailing={<><Text variant="body-strong" tone="positive">{formatMoney(12000)}</Text><Action>Settle up</Action></>} />
      <ListRow flush title="You owe Priya" trailing={<><Text variant="body-strong">{formatMoney(2500)}</Text><Action>Settle up</Action></>} />
    </Stack>
  );
}

function AccountTile() {
  const data = { chartType: 'sparkline', categories: TREND.map((_, i) => String(i + 1)), series: [{ name: 'Balance', data: TREND }] } as unknown as ChartInput;
  return (
    <Stack>
      <Text variant="caption" tone="ink-3">HDFC Savings</Text>
      <Text variant="figure">{formatMoney(284310)}</Text>
      <Chart data={data} money />
    </Stack>
  );
}

function EmergencyFund() {
  return (
    <Stack>
      <Text variant="figure" tone="warning">4.2 months</Text>
      <ProgressBar value={70} tone="warning" />
      <Text variant="caption" tone="ink-3">{`${formatMoney(315000)} in bank and cash · ${formatMoney(75000)} usual monthly outflow`}</Text>
    </Stack>
  );
}

function RewardsEarned() {
  return (
    <Stack>
      <Text variant="figure">{formatMoney(17340)}</Text>
      <Line label="Axis Atlas" value={`42,300 pts ≈ ${formatMoney(14100)}`} />
      <Line label="SBI Cashback" value={formatMoney(3240)} />
      <Line label="Amex MRCC" value="18,000 pts · Set value" />
      <StatusWords items={[{ tone: 'warning', label: '+ 18,000 points not valued' }]} />
    </Stack>
  );
}

function Shortcuts() {
  const labels = ['Add transaction', 'Review queue', 'Import statement', 'Upcoming'];
  return (
    <div className="grid grid-cols-2 gap-space-8">
      {labels.map((label) => (
        <Button key={label} tabIndex={-1} className="justify-start">
          {label}
        </Button>
      ))}
    </div>
  );
}

export const WIDGET_PREVIEWS: Readonly<Record<string, ComponentType>> = {
  net_worth: NetWorth,
  attention: Attention,
  upcoming: Upcoming,
  bills_due: BillsDue,
  card_utilisation: CardUtilisation,
  milestone_progress: MilestoneProgress,
  cap_headroom: CapHeadroom,
  portfolio_snapshot: PortfolioSnapshot,
  top_movers: TopMovers,
  allocation: Allocation,
  tax_harvest: TaxHarvest,
  spend_heatmap: SpendHeatmap,
  loan_payoff: LoanPayoff,
  lending_balances: LendingBalances,
  account_tile: AccountTile,
  emergency_fund: EmergencyFund,
  rewards_earned: RewardsEarned,
  shortcuts: Shortcuts,
};

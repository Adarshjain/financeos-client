// Static previews (sample data) for the cards & rewards, investments and
// loans & lending built-ins.

import { cn } from '@/lib/utils';

import {
  bigFigure,
  gainText,
  lossText,
  mutedText,
  PreviewBar,
  PreviewList,
  PreviewPill,
  PreviewRow,
} from './previewKit';

const CARDS: Array<[string, number]> = [
  ['SBI Cashback', 12],
  ['HDFC Regalia', 46],
  ['ICICI Amazon Pay', 78],
];

export function CardUtilisationPreview() {
  return (
    <PreviewList>
      {CARDS.map(([name, pct]) => (
        <div key={name} className="space-y-1">
          <PreviewRow label={name} value={`${pct.toFixed(1)}%`} />
          <PreviewBar pct={pct} />
        </div>
      ))}
    </PreviewList>
  );
}

export function MilestoneProgressPreview() {
  return (
    <div className="space-y-1.5">
      <PreviewRow label="Axis Atlas · ₹3,00,000 milestone" value="54%" />
      <PreviewBar pct={54} barClass="bg-emerald-500" />
      <p className={mutedText}>₹1,62,000 spent · 41 days left · ₹3,366 a day to reach it</p>
    </div>
  );
}

const CAPS: Array<[string, string, number]> = [
  ['SBI Cashback · Online 5%', '₹4,600 of ₹5,000', 92],
  ['HDFC Millennia · Amazon', '₹600 of ₹1,000', 60],
];

export function CapHeadroomPreview() {
  return (
    <PreviewList>
      {CAPS.map(([name, used, pct]) => (
        <div key={name} className="space-y-1">
          <PreviewRow label={name} value={used} />
          <PreviewBar pct={pct} />
        </div>
      ))}
    </PreviewList>
  );
}

const REWARDS: Array<[string, string]> = [
  ['Axis Atlas', '42,300 pts ≈ ₹14,100'],
  ['SBI Cashback', '₹3,240'],
  ['Amex MRCC', '18,000 pts · Set value'],
];

export function RewardsEarnedPreview() {
  return (
    <div className="space-y-2">
      <p className={bigFigure}>₹17,340</p>
      <PreviewList>
        {REWARDS.map(([card, value]) => (
          <PreviewRow key={card} label={card} value={value} />
        ))}
      </PreviewList>
      <p className={mutedText}>+ 18,000 points not valued</p>
    </div>
  );
}

export function PortfolioSnapshotPreview() {
  return (
    <div className="space-y-2">
      <div>
        <p className={bigFigure}>₹12,48,600</p>
        <p className={cn('text-2xs font-medium', gainText)}>+₹8,420 (+0.68%) since the last price update</p>
      </div>
      <PreviewList>
        <PreviewRow label="Invested" value="₹10,20,000" />
        <PreviewRow label="Unrealised gain" value="+₹2,28,600" valueClass={gainText} />
        <PreviewRow label="XIRR" value="14.2%" />
      </PreviewList>
    </div>
  );
}

const MOVERS: Array<[string, number]> = [
  ['Tata Motors', 3.4],
  ['HDFC Bank', 1.9],
  ['Infosys', -2.1],
];

export function TopMoversPreview() {
  return (
    <PreviewList>
      {MOVERS.map(([name, pct]) => (
        <PreviewRow
          key={name}
          label={name}
          value={`${pct > 0 ? '+' : '−'}${Math.abs(pct).toFixed(1)}%`}
          valueClass={pct > 0 ? gainText : lossText}
        />
      ))}
    </PreviewList>
  );
}

const SLICES: Array<[string, number, string]> = [
  ['Equity', 64, 'bg-emerald-500'],
  ['Debt', 21, 'bg-sky-500'],
  ['Hybrid', 7, 'bg-violet-500'],
  ['Gold', 5, 'bg-amber-500'],
  ['International', 3, 'bg-slate-400'],
];

export function AllocationPreview() {
  return (
    <div className="space-y-2">
      <div className="flex h-2.5 w-full overflow-hidden rounded-full">
        {SLICES.map(([name, pct, color]) => (
          <span key={name} className={color} style={{ width: `${pct}%` }} />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-x-3 gap-y-1">
        {SLICES.map(([name, pct, color]) => (
          <span key={name} className={cn(mutedText, 'flex items-center gap-1.5')}>
            <span className={cn('h-2 w-2 shrink-0 rounded-full', color)} />
            {name} {pct}%
          </span>
        ))}
      </div>
    </div>
  );
}

export function TaxHarvestPreview() {
  return (
    <div className="space-y-2">
      <PreviewRow label="LTCG booked this FY" value="₹48,000" />
      <PreviewBar pct={38} barClass="bg-emerald-500" />
      <p className={mutedText}>₹77,000 of the ₹1.25L exemption left</p>
      <div className="flex items-center justify-between gap-2">
        <span className="min-w-0 truncate text-xs text-slate-700 dark:text-slate-200">Nifty 50 ETF · +₹31,200</span>
        <PreviewPill>Worth selling</PreviewPill>
      </div>
    </div>
  );
}

export function LoanPayoffPreview() {
  return (
    <div className="space-y-1.5">
      <PreviewRow label="Home loan · left" value="₹38,40,000" />
      <PreviewBar pct={31} barClass="bg-emerald-500" />
      <p className={mutedText}>31% of principal repaid · paid off by 05/03/2041 · ₹21,60,000 interest to go</p>
    </div>
  );
}

const PEOPLE: Array<[string, string, boolean]> = [
  ['Rahul owes you', '₹12,000', true],
  ['You owe Priya', '₹2,500', false],
];

export function LendingBalancesPreview() {
  return (
    <PreviewList>
      {PEOPLE.map(([who, amount, owed]) => (
        <div key={who} className="flex items-center gap-2">
          <span className="min-w-0 flex-1 truncate text-xs text-slate-700 dark:text-slate-200">{who}</span>
          <span className={cn('text-xs font-semibold tabular-nums', owed ? gainText : 'text-slate-900 dark:text-white')}>{amount}</span>
          <PreviewPill>Settle up</PreviewPill>
        </div>
      ))}
    </PreviewList>
  );
}

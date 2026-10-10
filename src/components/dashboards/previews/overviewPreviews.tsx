// Static previews (sample data) for the overview, spending and shortcut
// built-ins: net worth, attention, upcoming, bills due, account tile,
// emergency fund, spend heatmap and shortcuts.

import { CalendarClock, Inbox, Plus, Upload } from 'lucide-react';

import { cn } from '@/lib/utils';

import {
  bigFigure,
  gainText,
  mutedText,
  PreviewBar,
  PreviewList,
  PreviewPill,
  PreviewRow,
  rowText,
} from './previewKit';

export function NetWorthPreview() {
  return (
    <div className="space-y-1">
      <p className={bigFigure}>₹48,62,300</p>
      <p className={cn('text-2xs font-medium', gainText)}>+₹1,24,500 vs last month</p>
    </div>
  );
}

const ATTENTION_ROWS: Array<[string, string]> = [
  ['HDFC Regalia bill ₹18,240 due in 2 days', 'Mark paid'],
  ['Home loan EMI ₹32,500 due tomorrow', 'Record'],
  ['12 transactions waiting for review', 'Review'],
];

export function AttentionPreview() {
  return (
    <PreviewList>
      {ATTENTION_ROWS.map(([text, action]) => (
        <div key={text} className="flex items-center gap-2">
          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
          <span className={cn(rowText, 'min-w-0 flex-1 truncate')}>{text}</span>
          <PreviewPill>{action}</PreviewPill>
        </div>
      ))}
    </PreviewList>
  );
}

const UPCOMING_ROWS: Array<[string, string, string]> = [
  ['11/10/2026', 'ICICI Amazon Pay bill', '₹6,410'],
  ['12/10/2026', 'Car loan EMI', '₹14,200'],
  ['15/10/2026', 'Rahul returns', '₹5,000'],
];

export function UpcomingPreview() {
  return (
    <PreviewList>
      {UPCOMING_ROWS.map(([date, title, amount]) => (
        <PreviewRow
          key={title}
          label={
            <>
              <span className={cn(mutedText, 'mr-2 tabular-nums')}>{date}</span>
              {title}
            </>
          }
          value={amount}
        />
      ))}
    </PreviewList>
  );
}

export function BillsDuePreview() {
  return (
    <PreviewList>
      <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 p-2 dark:border-slate-800">
        <div className="min-w-0">
          <p className={rowText}>HDFC Regalia · Statement</p>
          <p className={mutedText}>₹18,240 due 14/10/2026</p>
        </div>
        <PreviewPill>Mark paid</PreviewPill>
      </div>
      <div className="flex items-center justify-between gap-2 rounded-lg border border-slate-100 p-2 dark:border-slate-800">
        <div className="min-w-0">
          <p className={rowText}>SBI Cashback · Unbilled</p>
          <p className={mutedText}>₹4,120 so far this cycle</p>
        </div>
      </div>
    </PreviewList>
  );
}

const TREND = '0,22 12,20 24,21 36,16 48,17 60,12 72,14 84,9 96,10 108,6 120,4';

export function AccountTilePreview() {
  return (
    <div className="space-y-1.5">
      <p className={mutedText}>HDFC Savings</p>
      <p className={bigFigure}>₹2,84,310</p>
      <svg viewBox="0 0 120 26" className="h-8 w-full text-emerald-500" preserveAspectRatio="none">
        <polyline points={TREND} fill="none" stroke="currentColor" strokeWidth="2" vectorEffect="non-scaling-stroke" />
      </svg>
    </div>
  );
}

export function EmergencyFundPreview() {
  return (
    <div className="space-y-1.5">
      <p className={cn(bigFigure, 'text-amber-600 dark:text-amber-400')}>4.2 months</p>
      <PreviewBar pct={70} barClass="bg-amber-500" />
      <p className={mutedText}>₹3,15,000 in bank and cash · ₹75,000 usual monthly outflow</p>
    </div>
  );
}

// 12 weeks × 7 days of spend intensity (0–4), fixed so the preview never changes.
const HEAT = Array.from({ length: 84 }, (_, i) => (i * 7 + (i % 5) * 3 + (i % 3)) % 5);
const HEAT_CLASSES = [
  'bg-slate-100 dark:bg-slate-800',
  'bg-emerald-500/20',
  'bg-emerald-500/40',
  'bg-emerald-500/70',
  'bg-emerald-600',
];

export function SpendHeatmapPreview() {
  return (
    <div className="space-y-1.5">
      <div className="grid grid-flow-col grid-rows-7 gap-0.5">
        {HEAT.map((level, i) => (
          <span key={i} className={cn('aspect-square rounded-sm', HEAT_CLASSES[level])} />
        ))}
      </div>
      <p className={mutedText}>Darker days spent more</p>
    </div>
  );
}

const SHORTCUTS = [
  { label: 'Add transaction', Icon: Plus },
  { label: 'Review queue', Icon: Inbox },
  { label: 'Import statement', Icon: Upload },
  { label: 'Upcoming', Icon: CalendarClock },
];

export function ShortcutsPreview() {
  return (
    <div className="grid grid-cols-2 gap-2">
      {SHORTCUTS.map(({ label, Icon }) => (
        <div
          key={label}
          className="flex items-center gap-2 rounded-lg border border-slate-100 px-2 py-1.5 dark:border-slate-800"
        >
          <Icon className="h-3.5 w-3.5 shrink-0 text-slate-500" aria-hidden="true" />
          <span className={cn(rowText, 'truncate')}>{label}</span>
        </div>
      ))}
    </div>
  );
}

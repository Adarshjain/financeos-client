'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn, formatDate, formatMoney, getAccountName } from '@/lib/utils';

import { ReceiptStatusBadge } from './ReceiptStatusBadge';
import type { DividendMatchCandidate, DividendMatchItem, MatchReason, MatchTier } from './types';

export const REASON_LABELS: Record<MatchReason, string> = {
  EXACT_GROSS: 'Exact amount',
  NET_OF_RECORDED_TDS: 'Net of recorded TDS',
  NET_OF_10PCT_TDS: 'Net of 10% TDS',
  AMOUNT_WITHIN_BAND: 'Amount in range',
  SPLIT_RATIO_SUSPECT: 'Split multiple? check expected amount',
  DIVIDEND_KEYWORD: 'Says dividend',
  NAME_MATCH: 'Names the company',
  SYMBOL_MATCH: 'Mentions ticker',
};

export const TIER_CONFIG: Record<MatchTier, { label: string; className: string }> = {
  EXACT: { label: 'Exact', className: 'text-emerald-600 dark:text-emerald-400' },
  NET_OF_TDS: { label: 'Net of TDS', className: 'text-sky-600 dark:text-sky-400' },
  FUZZY: { label: 'Fuzzy', className: 'text-slate-500 dark:text-slate-400' },
};

function candidateLabel(c: DividendMatchCandidate, accountName: string) {
  const t = c.transaction;
  return `${t.description || t.sourcedDescription || 'Transaction'} · ${accountName} · ${formatDate(t.date)} · +${formatMoney(Math.abs(t.amount))}`;
}

interface ReconcileItemRowProps {
  item: DividendMatchItem;
  accounts: { id: string; name: string }[];
  selectedId?: string;
  selected?: DividendMatchCandidate;
  tdsOffered: boolean;
  recordTds: boolean;
  busy: boolean;
  confirming: boolean;
  onSelect: (transactionId: string) => void;
  onRecordTds: (value: boolean) => void;
  onConfirm: () => void;
}

export function ReconcileItemRow({
  item,
  accounts,
  selectedId,
  selected,
  tdsOffered,
  recordTds,
  busy,
  confirming,
  onSelect,
  onRecordTds,
  onConfirm,
}: ReconcileItemRowProps) {
  const d = item.dividend;
  const expectedNet = Number(d.amount || 0) - Number(d.tds || 0);
  const tier = selected ? TIER_CONFIG[selected.tier] : null;
  const checkboxId = `record-tds-${d.id}`;

  return (
    <div className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg flex flex-col sm:flex-row sm:items-start gap-3">
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-900 dark:text-slate-100">{d.symbol || d.instrumentName}</span>
          <span className="text-2xs text-slate-500">{d.brokerName}</span>
          <ReceiptStatusBadge status={d.receiptStatus} />
        </div>
        <div className="flex items-center gap-2 text-2xs text-slate-500">
          <span className="font-semibold tabular-nums text-slate-700 dark:text-slate-300">
            {formatMoney(expectedNet)}
          </span>
          <span>{formatDate(d.exDate ?? d.payDate)}</span>
        </div>
      </div>

      <div className="sm:w-96 shrink-0 space-y-1.5">
        <div className="flex items-center gap-2">
          {item.candidates.length === 1 ? (
            <div className="flex-1 min-w-0 text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
              {candidateLabel(item.candidates[0], getAccountName(accounts, item.candidates[0].transaction.accountId))}
            </div>
          ) : (
            <Select value={selectedId} onValueChange={onSelect}>
              <SelectTrigger className="h-8 text-xs flex-1 min-w-0">
                <SelectValue placeholder="Choose transaction" />
              </SelectTrigger>
              <SelectContent>
                {item.candidates.map((c) => (
                  <SelectItem key={c.transaction.id} value={c.transaction.id} className="text-xs">
                    {candidateLabel(c, getAccountName(accounts, c.transaction.accountId))}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          <Button size="micro" onClick={onConfirm} disabled={!selectedId || busy}>
            {confirming ? 'Confirming...' : 'Confirm'}
          </Button>
        </div>

        {selected && (
          <div className="flex flex-wrap items-center gap-1">
            {tier && <span className={cn('text-2xs font-semibold', tier.className)}>{tier.label}</span>}
            {selected.reasons.map((r) => (
              <Badge
                key={r}
                variant="outline"
                className={cn(
                  'text-2xs px-1 py-0',
                  r === 'SPLIT_RATIO_SUSPECT' &&
                    'text-amber-700 dark:text-amber-300 border-amber-300 dark:border-amber-800',
                )}
              >
                {REASON_LABELS[r]}
              </Badge>
            ))}
          </div>
        )}

        {tdsOffered && selected?.impliedTds != null && (
          <div className="flex items-center gap-1.5">
            <Checkbox
              id={checkboxId}
              checked={recordTds}
              onCheckedChange={(v) => onRecordTds(v === true)}
              disabled={busy}
            />
            <Label htmlFor={checkboxId} className="text-2xs text-slate-600 dark:text-slate-400">
              Record TDS {formatMoney(selected.impliedTds)}
            </Label>
          </div>
        )}
      </div>
    </div>
  );
}

'use client';

import { DateInput } from '@/components/ui/date-input';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePositions } from '@/lib/query/hooks/useInvestments';

import type { UseDividendLinkResult } from './useDividendLink';

const LABEL = 'text-xs font-semibold text-slate-700 dark:text-slate-300';

/** "New dividend" mode: record a fresh dividend row, then link it. */
export function DividendNewFields({ link }: { link: UseDividendLinkResult }) {
  const { data: positions = [], isLoading } = usePositions();

  return (
    <div className="space-y-3">
      <div className="space-y-1.5">
        <Label className={LABEL}>Holding</Label>
        <Select value={link.holding} onValueChange={link.setHolding}>
          <SelectTrigger className="h-9 text-xs" aria-label="Holding">
            <SelectValue placeholder={isLoading ? 'Loading holdings...' : 'Select holding'} />
          </SelectTrigger>
          <SelectContent>
            {positions.map((p) => (
              <SelectItem
                key={`${p.brokerAccountId}|${p.instrument.id}`}
                value={`${p.brokerAccountId}|${p.instrument.id}`}
              >
                {`${p.instrument.symbol ?? p.instrument.name} · ${p.brokerName}`}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label className={LABEL}>Type</Label>
          <Select
            value={link.type}
            onValueChange={(v) => link.setType(v as typeof link.type)}
          >
            <SelectTrigger className="h-9 text-xs" aria-label="Type">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="dividend">Dividend</SelectItem>
              <SelectItem value="interest">Interest</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="divAmount" className={LABEL}>
            Amount (gross)
          </Label>
          <Input
            id="divAmount"
            type="number"
            step="0.01"
            value={link.amount}
            onChange={(e) => link.setAmount(e.target.value)}
            className="h-9 text-xs"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="divPayDate" className={LABEL}>
            Pay date
          </Label>
          <DateInput id="divPayDate" value={link.payDate} onChange={(e) => link.setPayDate(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="divExDate" className={LABEL}>
            Ex-date (optional)
          </Label>
          <DateInput id="divExDate" value={link.exDate} onChange={(e) => link.setExDate(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="divTds" className={LABEL}>
            TDS (optional)
          </Label>
          <Input
            id="divTds"
            type="number"
            step="0.01"
            value={link.tds}
            onChange={(e) => link.setTds(e.target.value)}
            className="h-9 text-xs"
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="divNotes" className={LABEL}>
            Notes (optional)
          </Label>
          <Input
            id="divNotes"
            value={link.notes}
            onChange={(e) => link.setNotes(e.target.value)}
            className="h-9 text-xs"
          />
        </div>
      </div>
    </div>
  );
}

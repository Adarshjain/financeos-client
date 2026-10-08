'use client';

import type { ObligationKindFilter } from '@/components/obligations/types';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const KINDS: { value: ObligationKindFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'card_bill', label: 'Card bills' },
  { value: 'emi', label: 'EMIs' },
  { value: 'lending_due', label: 'Lending' },
  { value: 'statement_expected', label: 'Statements' },
];

export function UpcomingControls({
  months,
  onMonths,
  kind,
  onKind,
}: {
  months: number;
  onMonths: (m: number) => void;
  kind: ObligationKindFilter;
  onKind: (k: ObligationKindFilter) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 w-full">
      <Select value={String(months)} onValueChange={(v) => onMonths(Number(v))}>
        <SelectTrigger className="w-[120px] h-8 text-xs font-semibold" aria-label="Horizon">
          <SelectValue />
        </SelectTrigger>
        <SelectContent className="text-xs">
          {[1, 3, 6, 12].map((m) => (
            <SelectItem key={m} value={String(m)}>
              {m} Month{m === 1 ? '' : 's'}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <div className="flex flex-wrap gap-1.5">
        {KINDS.map((k) => (
          <Button
            key={k.value}
            size="xs"
            variant={kind === k.value ? 'filter-active' : 'filter'}
            onClick={() => onKind(k.value)}
          >
            {k.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

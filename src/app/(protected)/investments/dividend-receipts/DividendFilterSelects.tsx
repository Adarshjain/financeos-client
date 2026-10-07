import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Broker } from '@/lib/account.types';

interface DividendFilterSelectsProps {
  fyBuckets: string[];
  brokerAccounts: Broker[];
  fy: string;
  broker: string;
  type: string;
  onFyChange: (v: string) => void;
  onBrokerChange: (v: string) => void;
  onTypeChange: (v: string) => void;
}

export function DividendFilterSelects({
  fyBuckets,
  brokerAccounts,
  fy,
  broker,
  type,
  onFyChange,
  onBrokerChange,
  onTypeChange,
}: DividendFilterSelectsProps) {
  return (
    <>
    {/* Fiscal Year Filter */}
    <Select value={fy} onValueChange={onFyChange}>
      <SelectTrigger className="h-8 text-xs bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg font-semibold flex-1">
        <SelectValue placeholder="All Fiscal Years" />
      </SelectTrigger>
      <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs">
        <SelectItem value="all" className="text-xs font-medium">
          All FYs
        </SelectItem>
        {fyBuckets.map((label) => (
          <SelectItem key={label} value={label} className="text-xs font-medium">
            {label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>

    {/* Broker Filter */}
    <Select value={broker} onValueChange={onBrokerChange}>
      <SelectTrigger className="h-8 text-xs bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg font-semibold flex-1">
        <SelectValue placeholder="All Brokers" />
      </SelectTrigger>
      <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs">
        <SelectItem value="all" className="text-xs font-medium">
          All Brokers
        </SelectItem>
        {brokerAccounts.map((b) => (
          <SelectItem key={b.id} value={b.id} className="text-xs font-medium">
            {b.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>

    {/* Type Filter */}
    <Select value={type} onValueChange={onTypeChange}>
      <SelectTrigger className="h-8 text-xs bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg font-semibold flex-1">
        <SelectValue placeholder="All Types" />
      </SelectTrigger>
      <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs">
        <SelectItem value="all" className="text-xs font-medium">
          All Types
        </SelectItem>
        <SelectItem value="dividend" className="text-xs font-medium">
          Dividend
        </SelectItem>
        <SelectItem value="interest" className="text-xs font-medium">
          Interest
        </SelectItem>
        <SelectItem value="other" className="text-xs font-medium">
          Other
        </SelectItem>
      </SelectContent>
    </Select>
    </>
  );
}

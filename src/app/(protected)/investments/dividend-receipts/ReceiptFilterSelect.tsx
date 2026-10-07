import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export const RECEIPT_FILTER_OPTIONS = [
  { value: 'all', label: 'All receipts' },
  { value: 'received', label: 'Received' },
  { value: 'awaiting', label: 'Awaiting' },
  { value: 'overdue', label: 'Overdue' },
  { value: 'unverifiable', label: 'No bank data' },
  { value: 'received_untracked', label: 'Received (untracked)' },
  { value: 'not_received', label: 'Not received' },
] as const;

interface ReceiptFilterSelectProps {
  value: string;
  onChange: (value: string) => void;
}

export function ReceiptFilterSelect({ value, onChange }: ReceiptFilterSelectProps) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger
        aria-label="Receipt status"
        className="h-8 text-xs bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg font-semibold flex-1"
      >
        <SelectValue placeholder="All receipts" />
      </SelectTrigger>
      <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs">
        {RECEIPT_FILTER_OPTIONS.map((o) => (
          <SelectItem key={o.value} value={o.value} className="text-xs font-medium">
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

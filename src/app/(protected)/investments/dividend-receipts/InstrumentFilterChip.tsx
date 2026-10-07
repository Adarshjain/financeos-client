import { X } from 'lucide-react';

interface InstrumentFilterChipProps {
  /** Symbol / name of the filtered instrument when known from loaded rows. */
  label?: string;
  onClear: () => void;
}

export function InstrumentFilterChip({ label, onClear }: InstrumentFilterChipProps) {
  return (
    <button
      type="button"
      onClick={onClear}
      aria-label="Clear instrument filter"
      className="inline-flex items-center gap-1 rounded-full border border-sky-200 dark:border-sky-800 bg-sky-50 dark:bg-sky-950/60 px-2 py-0.5 text-2xs font-medium text-sky-700 dark:text-sky-300"
    >
      {label ? `Showing ${label}` : 'Showing one instrument'}
      <X className="h-3 w-3" />
    </button>
  );
}

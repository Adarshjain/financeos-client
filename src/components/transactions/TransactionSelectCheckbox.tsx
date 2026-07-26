'use client';

import { Checkbox } from '@/components/ui/checkbox';

interface TransactionSelectCheckboxProps {
  transactionId: string;
  selected?: boolean;
  onToggle?: () => void;
}

/**
 * Selection control for a transaction card. The wrapper owns the click so the
 * whole hit area toggles selection without also opening the card's detail
 * dialog — hence `stopPropagation` here and `pointer-events-none` on the box.
 */
export function TransactionSelectCheckbox({
  transactionId,
  selected,
  onToggle,
}: TransactionSelectCheckboxProps) {
  return (
    <div
      className="flex items-center justify-center pr-2 self-center shrink-0 cursor-pointer"
      onClick={(e) => {
        e.stopPropagation();
        onToggle?.();
      }}
    >
      <Checkbox checked={selected} className="pointer-events-none" id={`select-${transactionId}`} />
    </div>
  );
}

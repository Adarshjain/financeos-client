import { cn } from './cn';

export interface ItemRowStyleOptions {
  active?: boolean;
  destructive?: boolean;
  action?: boolean;
  disabled?: boolean;
  className?: string;
}

export function getItemRowClass({
  active = false,
  destructive = false,
  action = false,
  disabled = false,
  className,
}: ItemRowStyleOptions = {}): string {
  return cn(
    'flex items-center gap-space-10 min-h-control-lg px-space-10 rounded-ds-md font-text font-semibold text-body select-none transition-colors duration-fast outline-none',
    'focus:outline-none focus:ring-2 focus:ring-focus-ring focus:ring-inset focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-focus-ring focus-visible:ring-inset',
    !disabled && !destructive && !active && !action && 'text-ink hover:bg-hover focus:bg-hover cursor-pointer',
    !disabled && active && 'bg-brand-tint text-brand-strong hover:bg-brand-tint focus:bg-brand-tint cursor-pointer',
    !disabled && destructive && 'text-danger hover:bg-danger-tint focus:bg-danger-tint cursor-pointer',
    !disabled && action && 'text-brand font-bold hover:bg-hover focus:bg-hover cursor-pointer',
    disabled && 'text-ink-faint cursor-not-allowed',
    className,
  );
}

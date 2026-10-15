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
    'flex items-center gap-space-10 min-h-control-lg px-space-10 rounded-ds-md font-text font-medium text-body select-none transition-colors duration-fast outline-none',
    !disabled && !destructive && !active && !action && 'text-ink hover:bg-hover active:bg-pressed focus:bg-hover cursor-pointer',
    !disabled && active && 'bg-brand-tint text-brand-strong hover:bg-brand-tint active:bg-brand-tint focus:bg-brand-tint cursor-pointer',
    !disabled && destructive && 'text-danger hover:bg-danger-tint active:bg-danger-tint focus:bg-danger-tint cursor-pointer',
    !disabled && action && 'text-brand font-bold hover:bg-hover active:bg-pressed focus:bg-hover cursor-pointer',
    disabled && 'text-ink-faint cursor-not-allowed',
    className,
  );
}

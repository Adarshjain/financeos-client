import { cn } from './cn';

export interface ItemRowStyleOptions {
  active?: boolean;
  tone?: 'neutral' | 'danger';
  action?: boolean;
  disabled?: boolean;
  className?: string;
}

export function getItemRowClass({
  active = false,
  tone = 'neutral',
  action = false,
  disabled = false,
  className,
}: ItemRowStyleOptions = {}): string {
  return cn(
    'flex items-center gap-space-10 min-h-control-lg px-space-10 rounded-ds-md font-text font-medium text-body select-none transition-colors duration-fast outline-none',
    !disabled && tone !== 'danger' && !active && !action && 'text-ink hover:bg-hover active:bg-pressed focus:bg-hover cursor-pointer',
    !disabled && active && 'bg-brand-tint text-brand-strong hover:bg-brand-tint active:bg-brand-tint focus:bg-brand-tint cursor-pointer',
    !disabled && tone === 'danger' && 'text-danger hover:bg-danger-tint active:bg-danger-tint focus:bg-danger-tint cursor-pointer',
    !disabled && action && 'text-brand font-bold hover:bg-hover active:bg-pressed focus:bg-hover cursor-pointer',
    disabled && 'text-ink-faint cursor-not-allowed',
    className,
  );
}

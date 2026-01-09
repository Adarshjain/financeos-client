
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Logo({ className, showText = true, size = 'md' }: LogoProps) {
  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div
        className={cn(
          'rounded-lg bg-primary p-1 px-2'
        )}
      >
        ₹
      </div>
      {showText && (
        <span
          className={cn(
            'font-bold text-slate-900 dark:text-white',
            size === 'sm' && 'text-sm',
            size === 'md' && 'text-lg',
            size === 'lg' && 'text-2xl',
            size === 'xl' && 'text-3xl'
          )}
        >
          FinanceOS
        </span>
      )}
    </div>
  );
}

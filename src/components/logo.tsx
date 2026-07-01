
import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

export function Logo({ className, showText = true, size = 'md' }: LogoProps) {
  return (
    <div className={cn('flex items-center gap-2.5 group cursor-pointer', className)}>
      <div
        className={cn(
          'rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 p-1.5 px-3 text-white font-black shadow-md shadow-emerald-500/20 transform transition-transform duration-300 group-hover:scale-105 group-hover:rotate-3'
        )}
      >
        ₹
      </div>
      {showText && (
        <span
          className={cn(
            'font-black tracking-tight bg-gradient-to-r from-slate-900 via-slate-800 to-slate-950 dark:from-white dark:via-slate-100 dark:to-slate-200 bg-clip-text text-transparent',
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

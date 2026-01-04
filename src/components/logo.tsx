import Image from 'next/image';

import { cn } from '@/lib/utils';

interface LogoProps {
  className?: string;
  showText?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeMap = {
  sm: 32,
  md: 40,
  lg: 56,
  xl: 72,
};

export function Logo({ className, showText = true, size = 'md' }: LogoProps) {
  const dimension = sizeMap[size];

  return (
    <div className={cn('flex items-center gap-3', className)}>
      <div
        className={cn(
          'relative overflow-hidden rounded-lg'
          // We use the image directly, but keep the container styles if we want a background
          // but since the logo is a PNG, we might just want to show it.
          // Let's rely on the image itself.
        )}
      >
        <Image
          src="/images/logo.png"
          alt="FinanceOS Logo"
          width={dimension}
          height={dimension}
          className="object-contain"
        />
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

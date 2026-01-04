import * as React from 'react';

import { cn } from '@/lib/utils';

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<'input'>>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'w-full px-3.5 py-2.5 text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-900 border rounded-lg transition-colors duration-200',
          'placeholder:text-slate-400 dark:placeholder:text-slate-500',
          'border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600',
          'focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent',
          'disabled:bg-slate-50 dark:disabled:bg-slate-800 disabled:text-slate-500 disabled:cursor-not-allowed',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };

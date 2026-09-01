'use client';

import { Laptop, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useSyncExternalStore } from 'react';

import { cn } from '@/lib/utils';

const emptySubscribe = () => () => {};

export function ThemeSwitcher({ className }: { className?: string }) {
  const { theme, setTheme } = useTheme();
  const mounted = useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );

  const options = [
    { value: 'light', label: 'Light', icon: Sun },
    { value: 'dark', label: 'Dark', icon: Moon },
    { value: 'system', label: 'System', icon: Laptop },
  ] as const;

  return (
    <div
      className={cn(
        'inline-flex items-center p-0.5 bg-slate-100 dark:bg-slate-800/90 rounded-lg gap-0.5 border border-slate-200/60 dark:border-slate-700/50',
        className
      )}
    >
      {options.map((opt) => {
        const Icon = opt.icon;
        const isSelected = mounted && theme === opt.value;

        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => setTheme(opt.value)}
            title={opt.label}
            aria-label={`${opt.label} theme`}
            className={cn(
              'flex items-center justify-center h-7 w-7 rounded-md transition-all cursor-pointer',
              isSelected
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-xs'
                : 'text-slate-400 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200'
            )}
          >
            <Icon className="w-3.5 h-3.5" />
          </button>
        );
      })}
    </div>
  );
}

export function ThemeSettingsCard() {
  return (
    <div className="flex justify-between items-center px-6 py-3.5">
      <span className="text-sm font-semibold text-slate-800 dark:text-slate-200">
        Theme
      </span>
      <ThemeSwitcher />
    </div>
  );
}

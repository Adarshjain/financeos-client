'use client';

import { Monitor, Moon, Sun } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useEffect, useState } from 'react';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/lib/utils';

export function ThemeSettingsCard() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      setMounted(true);
    });
    return () => cancelAnimationFrame(frame);
  }, []);

  if (!mounted) {
    return (
      <Card className="rounded-xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm animate-pulse">
        <div className="h-28" />
      </Card>
    );
  }

  const themes = [
    {
      id: 'light',
      label: 'Light',
      icon: <Sun className="h-4 w-4" />,
    },
    {
      id: 'dark',
      label: 'Dark',
      icon: <Moon className="h-4 w-4" />,
    },
    {
      id: 'system',
      label: 'System',
      icon: <Monitor className="h-4 w-4" />,
    },
  ];

  return (
    <Card className="rounded-xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-sm">
      <CardHeader className="px-6 py-4 border-b border-slate-105 dark:border-slate-800">
        <CardTitle className="text-base font-bold text-slate-900 dark:text-white">Appearance</CardTitle>
        <CardDescription className="text-xs text-slate-500 dark:text-slate-400">
          Customize how FinanceOS looks on your device
        </CardDescription>
      </CardHeader>
      <CardContent className="p-6">
        <div className="grid grid-cols-3 gap-2.5 p-1 bg-slate-50 dark:bg-slate-950 border border-slate-100 dark:border-slate-850/60 rounded-xl max-w-md">
          {themes.map((t) => {
            const isActive = theme === t.id;
            return (
              <button
                key={t.id}
                type="button"
                className={cn(
                  'flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 focus:outline-none select-none',
                  isActive
                    ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm border border-slate-200/40 dark:border-slate-800'
                    : 'text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200'
                )}
                onClick={() => setTheme(t.id)}
              >
                {t.icon}
                <span>{t.label}</span>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

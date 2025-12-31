'use client';

import { logout } from '@/actions/auth';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/theme-toggle';
import { LogOut } from 'lucide-react';
import type { UserResponse } from '@/lib/types';

interface HeaderProps {
  user: UserResponse;
  title?: string;
}

export function Header({ user }: HeaderProps) {
  return (
    <header className="hidden lg:flex sticky top-0 z-30 h-16 items-center justify-between px-6 bg-white/95 dark:bg-slate-900/95 backdrop-blur supports-[backdrop-filter]:bg-white/60 dark:supports-[backdrop-filter]:bg-slate-900/60 border-b border-slate-200 dark:border-slate-800">
      <div />
      
      <div className="flex items-center gap-3">
        <ThemeToggle />
        
        <div className="text-right pl-3 border-l border-slate-200 dark:border-slate-700">
          <p className="text-xs text-slate-500">Signed in as</p>
          <p className="text-sm font-medium text-slate-900 dark:text-white">{user.email}</p>
        </div>
        
        <form action={logout}>
          <Button variant="ghost" size="icon" type="submit" title="Sign out">
            <LogOut className="h-5 w-5" />
          </Button>
        </form>
      </div>
    </header>
  );
}

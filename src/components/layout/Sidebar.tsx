'use client';

import { LogOut } from 'lucide-react';
import Link from 'next/link';

import { logout } from '@/actions/auth';
import { NavTree } from '@/components/layout/NavTree';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';

export function Sidebar({ userEmail }: { userEmail: string }) {
  return (
    <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
      {/* App Logo */}
      <div className="h-16 flex items-center px-6 border-b border-slate-100 dark:border-slate-800/60">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Logo size="md" />
        </Link>
      </div>

      {/* Main Navigation Tree */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <NavTree />
      </nav>

      {/* User Info */}
      <div className="p-3 mx-4 mb-2 rounded-xl bg-slate-50 dark:bg-slate-900/40 border border-slate-100 dark:border-slate-800/40">
        <p className="text-2xs uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">
          Signed in as
        </p>
        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate mt-0.5">
          {userEmail}
        </p>
      </div>

      {/* Sign out */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800/80">
        <form action={logout}>
          <Button
            variant="outline"
            type="submit"
            className="w-full hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/20 dark:hover:text-rose-400 hover:border-rose-100 dark:hover:border-rose-900/20"
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign out
          </Button>
        </form>
      </div>
    </aside>
  );
}

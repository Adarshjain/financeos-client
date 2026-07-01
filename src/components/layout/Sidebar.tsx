'use client';

import {
  BarChart3,
  Home,
  LayoutDashboard,
  LogOut,
  Receipt,
  Settings,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

import { logout } from '@/actions/auth';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface NavItem {
  href: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  {
    href: '/dashboard',
    label: 'Dashboard',
    icon: <Home className="h-5 w-5" />,
  },
  {
    href: '/accounts',
    label: 'Accounts',
    icon: <Wallet className="h-5 w-5" />,
  },
  {
    href: '/transactions',
    label: 'Transactions',
    icon: <Receipt className="h-5 w-5" />,
  },
  {
    href: '/investments',
    label: 'Investments',
    icon: <TrendingUp className="h-5 w-5" />,
  },
  {
    href: '/reports',
    label: 'Reports',
    icon: <BarChart3 className="h-5 w-5" />,
  },
  {
    href: '/dashboards',
    label: 'Dashboards',
    icon: <LayoutDashboard className="h-5 w-5" />,
  },
  {
    href: '/settings',
    label: 'Settings',
    icon: <Settings className="h-5 w-5" />,
  },
];

export function Sidebar({ userEmail }: { userEmail: string }) {
  const pathname = usePathname();

  return (
    <aside className="hidden lg:flex lg:flex-col lg:fixed lg:inset-y-0 lg:left-0 lg:w-64 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800">
      {/* Logo */}
      <div className="h-16 flex items-center px-6">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Logo size="md" />
        </Link>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + '/');
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200',
                isActive
                  ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md shadow-emerald-500/10'
                  : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white hover:bg-slate-50 dark:hover:bg-slate-850/50'
              )}
            >
              <span className={cn('transition-transform duration-200 group-hover:scale-105', isActive ? 'text-white' : 'text-slate-400 dark:text-slate-400')}>{item.icon}</span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
      <div className="p-3 mx-4 mb-3 rounded-xl bg-slate-50 dark:bg-slate-900/30 border border-slate-100 dark:border-slate-800/40">
        <p className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500">Signed in as</p>
        <p className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate mt-0.5">
          {userEmail}
        </p>
      </div>
      <div className="p-4 border-t border-slate-100 dark:border-slate-800/80">
        <form action={logout}>
          <Button variant="outline" size="sm" type="submit" className="w-full h-9 rounded-xl border-slate-200 dark:border-slate-850 text-slate-700 dark:text-slate-300 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/20 dark:hover:text-rose-400 hover:border-rose-100 dark:hover:border-rose-900/20 transition-all font-medium">
            <LogOut className="h-4 w-4 mr-2" />
            Sign out
          </Button>
        </form>
      </div>
    </aside>
  );
}

'use client';

import { Check, ChevronDown, Eye, MessageCircle } from 'lucide-react';
import Link from 'next/link';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { DashboardResponse } from '@/lib/dashboards.types';
import { cn } from '@/lib/utils';

interface DashboardViewProps {
  dashboards: DashboardResponse[];
  currentDashboard: DashboardResponse;
  onSelectDashboard: (dashboard: DashboardResponse) => void;
}

export function DashboardSelector({ dashboards, onSelectDashboard, currentDashboard }: DashboardViewProps) {
  return (
    // The switcher fills the row; the Chat shortcut (phones and tablets only) keeps its natural width.
    <div className="flex items-center gap-2 px-4">
      <div className="min-w-0 flex-1">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Switch dashboard, current: ${currentDashboard.name}`}
              className="flex h-10 w-full min-w-0 items-center justify-between gap-2 rounded-xl border border-slate-200 bg-white px-3 text-left font-black tracking-tight text-slate-900 shadow-sm transition-colors hover:border-slate-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 select-none dark:border-slate-800 dark:bg-slate-900 dark:text-white dark:hover:border-slate-700"
            >
              <span className="truncate">{currentDashboard.name}</span>
              <ChevronDown className="h-5 w-5 shrink-0 text-slate-400" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-[var(--radix-dropdown-menu-trigger-width)] rounded-xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-950 p-1.5 shadow-lg shadow-slate-100/10 dark:shadow-none" align="start">
            <div className="py-1 px-2.5 text-2xs font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">
              Switch Dashboard
            </div>
            <div className="space-y-0.5 mt-1">
              {dashboards?.map(d => (
                <DropdownMenuItem
                  key={d.id}
                  className={cn(
                    'flex items-center justify-between py-2 px-3 rounded-lg text-xs font-medium cursor-pointer transition-colors',
                    currentDashboard.id === d.id
                      ? 'bg-slate-50 dark:bg-slate-900 text-slate-900 dark:text-white font-semibold'
                      : 'text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900'
                  )}
                  onClick={() => onSelectDashboard(d)}
                >
                  <span>{d.name}</span>
                  {currentDashboard.id === d.id && <Check className="w-4 h-4 text-emerald-500 shrink-0" />}
                </DropdownMenuItem>
              ))}
            </div>
            <DropdownMenuSeparator className="bg-slate-100 dark:bg-slate-800/80 my-1.5" />
            <Link href="/dashboards">
              <DropdownMenuItem className="flex items-center gap-2 py-2 px-3 rounded-lg text-xs font-medium cursor-pointer text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
                <Eye className="w-4 h-4 text-slate-400" />
                <span>View All Dashboards</span>
              </DropdownMenuItem>
            </Link>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      {/* Desktop has Chat in the sidebar header; keep this shortcut for smaller screens. */}
      <Button variant="outline" asChild aria-label="Chat with your data" className="h-10 shrink-0 lg:hidden">
        <Link href="/chat">
          <MessageCircle className="w-4 h-4 text-slate-400" /> Chat
        </Link>
      </Button>
    </div>
  );
}

'use client';

import { Check, ChevronDown, Eye } from 'lucide-react';
import Link from 'next/link';

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
    <div className="flex flex-wrap items-center justify-between gap-2 px-4 mb-4">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <button className="flex items-center gap-2 text-2xl font-black tracking-tight text-slate-900 dark:text-white hover:text-slate-700 dark:hover:text-slate-200 transition-colors focus:outline-none select-none">
            <span>{currentDashboard.name}</span>
            <ChevronDown className="w-5 h-5 text-slate-400 mt-1" />
          </button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-[260px] md:w-[300px] rounded-xl border border-slate-200/60 dark:border-slate-800 bg-white dark:bg-slate-950 p-1.5 shadow-lg shadow-slate-100/10 dark:shadow-none" align="start">
          <div className="py-1 px-2.5 text-[10px] font-bold text-slate-450 dark:text-slate-500 uppercase tracking-wider">
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
                    : 'text-slate-650 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-900'
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
            <DropdownMenuItem className="flex items-center gap-2 py-2 px-3 rounded-lg text-xs font-medium cursor-pointer text-slate-650 dark:text-slate-350 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors">
              <Eye className="w-4 h-4 text-slate-400" />
              <span>View All Dashboards</span>
            </DropdownMenuItem>
          </Link>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

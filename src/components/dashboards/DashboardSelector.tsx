'use client';

import { Check, ChevronDown, Eye } from 'lucide-react';
import Link from 'next/link';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type { DashboardResponse } from '@/lib/dashboards.types';


interface DashboardViewProps {
  dashboards: DashboardResponse[];
  currentDashboard: DashboardResponse;
  onSelectDashboard: (dashboard: DashboardResponse) => void;
}

export function DashboardSelector({ dashboards, onSelectDashboard, currentDashboard }: DashboardViewProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 px-4">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <div className="flex justify-between items-center flex-1 text-2xl font-bold text-slate-900 dark:text-white">
            {currentDashboard.name}
            <ChevronDown className="w-6 h-6" />
          </div>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="min-w-[90vw]" align="start">
          <div className="w-full">
            {dashboards?.map(d => <DropdownMenuItem
              key={d.id}
              className="flex items-center gap-2 py-2 px-3"
              onClick={() => onSelectDashboard(d)}
            >
              {currentDashboard.id === d.id ? <Check className="w-4 h-4" /> : <div className="w-4"></div>}
              {d.name}
            </DropdownMenuItem>)}
          </div>
          <div className="border-b h-[1px] border-gray-300 w-full"></div>
          <Link href="/dashboards">
            <DropdownMenuItem className="flex items-center gap-2 py-2 px-3">
              <Eye className="w-4 h-4" />View All Dashboards
            </DropdownMenuItem>
          </Link>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

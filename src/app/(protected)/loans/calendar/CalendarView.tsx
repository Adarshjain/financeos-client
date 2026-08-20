'use client';

import {
  AlertCircle,
  ArrowDownLeft,
  ArrowUpRight,
  Calendar as CalendarIcon,
  ChevronRight,
  DollarSign,
  Wallet,
} from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';

import { fetchUpcomingObligationsAction } from '@/actions/lendings';
import { PageActionBar } from '@/components/layout/PageActionBarContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ObligationItemDto, ObligationsResponse } from '@/lib/types';
import { cn, formatDate, formatMoney } from '@/lib/utils';

interface CalendarViewProps {
  initialObligations: ObligationsResponse;
}

export function CalendarView({ initialObligations }: CalendarViewProps) {
  const [months, setMonths] = useState<number>(3);
  const [obligations, setObligations] = useState<ObligationItemDto[]>(
    initialObligations.items,
  );

  const handleMonthsChange = async (newMonthsStr: string) => {
    const m = Number(newMonthsStr);
    setMonths(m);
    const res = await fetchUpcomingObligationsAction(m);
    if (res.success) {
      setObligations(res.data.items);
    } else {
      toast.error(res.error.message);
    }
  };


  const overdueItems = obligations.filter((i) => i.status === 'overdue');
  const upcomingItems = obligations.filter((i) => i.status === 'upcoming');

  const getMonthGroupKey = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleString('default', { month: 'long', year: 'numeric' });
  };

  const monthlyGroups = upcomingItems.reduce((acc, item) => {
    const key = getMonthGroupKey(item.date);
    if (!acc[key]) acc[key] = [];
    acc[key].push(item);
    return acc;
  }, {} as Record<string, ObligationItemDto[]>);

  const renderActionBar = (isMobile = false) => (
    <div className={cn('flex items-center justify-between gap-2 w-full', isMobile ? 'text-xs' : '')}>
      <div className="flex items-center gap-2">
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
          Schedule Window:
        </span>
        <Select value={String(months)} onValueChange={handleMonthsChange}>
          <SelectTrigger className="w-[130px] h-8 text-xs bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg font-semibold">
            <SelectValue placeholder="3 Months" />
          </SelectTrigger>
          <SelectContent className="bg-white dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-xs">
            <SelectItem value="1">1 Month</SelectItem>
            <SelectItem value="3">3 Months</SelectItem>
            <SelectItem value="6">6 Months</SelectItem>
            <SelectItem value="12">12 Months</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );

  return (
    <div className="pb-20 p-3 sm:p-6 space-y-3 max-w-7xl mx-auto w-full min-w-0 overflow-x-hidden">
      {/* Hero Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            Obligations Calendar
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Timeline of upcoming loan EMIs and P2P expected returns over your chosen schedule window
          </p>
        </div>
      </div>

      {/* Action Bar / Window Selector Card */}
      <Card className="hidden lg:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl p-3">
        {renderActionBar(false)}
      </Card>

      <PageActionBar>
        {renderActionBar(true)}
      </PageActionBar>

      {/* Overdue Section */}
      {overdueItems.length > 0 && (
        <div className="bg-rose-50/60 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900/50 rounded-xl overflow-hidden shadow-sm">
          <div className="p-4 border-b border-rose-200 dark:border-rose-900/50 flex items-center justify-between">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 font-bold text-sm">
              <AlertCircle className="h-4 w-4" /> Overdue Obligations ({overdueItems.length})
            </div>
          </div>
          <div className="divide-y divide-rose-100 dark:divide-rose-900/40">
            {overdueItems.map((item, idx) => (
              <div key={idx} className="p-3.5 flex items-center justify-between hover:bg-rose-100/40 transition-colors text-xs">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-rose-100 dark:bg-rose-900/50 text-rose-600 shrink-0">
                    {item.type === 'emi' ? <Wallet className="h-4 w-4" /> : <DollarSign className="h-4 w-4" />}
                  </div>
                  <div>
                    <div className="font-semibold text-slate-900 dark:text-slate-100">
                      {item.type === 'emi'
                        ? `${item.loanName} · EMI #${item.installmentSeq}`
                        : `${item.counterpartyName} (${item.direction === 'lent' ? 'Lent Return' : 'Borrowed Payback'})`}
                    </div>
                    <div className="text-slate-500 text-xs">
                      Due: <span className="font-semibold text-rose-600">{formatDate(item.date)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="font-bold text-rose-600 tabular-nums">{formatMoney(item.amount)}</div>
                    <Badge variant="destructive" className="capitalize text-2xs px-1.5 py-0">Overdue</Badge>
                  </div>
                  <Button variant="ghost" size="icon-sm" asChild className="text-slate-400">
                    <Link href={item.type === 'emi' ? `/loans/${item.loanId}` : `/loans/lendings/${item.counterpartyId}`}>
                      <ChevronRight className="h-4 w-4" />
                    </Link>
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Monthly Timeline Groups */}
      <div className="space-y-3">
        {Object.keys(monthlyGroups).length === 0 ? (
          <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-12 text-center text-slate-400 text-xs">
            <CalendarIcon className="h-8 w-8 mx-auto mb-2 opacity-40" />
            No upcoming obligations scheduled within the selected {months}-month window.
          </div>
        ) : (
          Object.entries(monthlyGroups).map(([monthYear, items]) => (
            <div key={monthYear} className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
              <div className="p-3.5 bg-slate-50/80 dark:bg-slate-950/60 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs font-bold">
                <span>{monthYear}</span>
                <span className="text-slate-500 font-normal tabular-nums">
                  Total Due: {formatMoney(items.reduce((s, i) => s + i.amount, 0))}
                </span>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((item, idx) => (
                  <div key={idx} className="p-3.5 flex items-center justify-between hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors text-xs">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-slate-100 dark:bg-slate-800 text-slate-500 shrink-0">
                        {item.type === 'emi' ? (
                          <Wallet className="h-4 w-4 text-slate-700 dark:text-slate-300" />
                        ) : item.direction === 'lent' ? (
                          <ArrowUpRight className="h-4 w-4 text-emerald-600" />
                        ) : (
                          <ArrowDownLeft className="h-4 w-4 text-rose-600" />
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-slate-100">
                          {item.type === 'emi'
                            ? `${item.loanName} · EMI #${item.installmentSeq}`
                            : `${item.counterpartyName} (${item.direction === 'lent' ? 'Receivable' : 'Payable'})`}
                        </div>
                        <div className="text-slate-500 text-xs">
                          Due: <span className="font-medium text-slate-800 dark:text-slate-200">{formatDate(item.date)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="font-bold text-slate-900 dark:text-slate-100 tabular-nums">{formatMoney(item.amount)}</div>
                        <Badge variant="outline" className="capitalize text-2xs px-1.5 py-0">
                          {item.type === 'emi' ? 'Loan EMI' : 'P2P Due'}
                        </Badge>
                      </div>
                      <Button variant="ghost" size="icon-sm" asChild className="text-slate-400">
                        <Link href={item.type === 'emi' ? `/loans/${item.loanId}` : `/loans/lendings/${item.counterpartyId}`}>
                          <ChevronRight className="h-4 w-4" />
                        </Link>
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

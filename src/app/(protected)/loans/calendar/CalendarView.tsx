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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ObligationItemDto, ObligationsResponse } from '@/lib/types';
import { formatDate, formatMoney } from '@/lib/utils';

interface CalendarViewProps {
  initialObligations: ObligationsResponse;
}

export function CalendarView({ initialObligations }: CalendarViewProps) {
  const [months, setMonths] = useState<number>(3);
  const [obligations, setObligations] = useState<ObligationItemDto[]>(
    initialObligations.items,
  );
  const [loading, setLoading] = useState(false);

  const handleMonthsChange = async (newMonthsStr: string) => {
    const m = Number(newMonthsStr);
    setMonths(m);
    setLoading(true);
    try {
      const res = await fetchUpcomingObligationsAction(m);
      if (res.success) {
        setObligations(res.data.items);
      } else {
        toast.error(res.error.message);
      }
    } finally {
      setLoading(false);
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

  return (
    <div className="space-y-4">
      {/* PageActionBar */}
      <PageActionBar>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-slate-500 uppercase">
            Window:
          </span>
          <Select value={String(months)} onValueChange={handleMonthsChange}>
            <SelectTrigger className="w-[120px] h-8 text-xs bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800">
              <SelectValue placeholder="3 Months" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="1" className="text-xs">1 Month</SelectItem>
              <SelectItem value="3" className="text-xs">3 Months</SelectItem>
              <SelectItem value="6" className="text-xs">6 Months</SelectItem>
              <SelectItem value="12" className="text-xs">12 Months</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </PageActionBar>

      {/* Overdue Section (Flat list inside container) */}
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
                    <div className="text-slate-500 text-[11px]">
                      Due: <span className="font-semibold text-rose-600">{formatDate(item.date)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <div className="font-bold text-rose-600">{formatMoney(item.amount)}</div>
                    <Badge variant="destructive" className="capitalize text-[9px] px-1.5 py-0">Overdue</Badge>
                  </div>
                  <Button variant="ghost" size="icon" asChild className="h-8 w-8 text-slate-400">
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
      <div className="space-y-4">
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
                <span className="text-slate-500 font-normal">
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
                        <div className="text-slate-500 text-[11px]">
                          Due: <span className="font-medium text-slate-800 dark:text-slate-200">{formatDate(item.date)}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="font-bold text-slate-900 dark:text-slate-100">{formatMoney(item.amount)}</div>
                        <Badge variant="outline" className="capitalize text-[9px] px-1.5 py-0">
                          {item.type === 'emi' ? 'Loan EMI' : 'P2P Due'}
                        </Badge>
                      </div>
                      <Button variant="ghost" size="icon" asChild className="h-8 w-8 text-slate-400">
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

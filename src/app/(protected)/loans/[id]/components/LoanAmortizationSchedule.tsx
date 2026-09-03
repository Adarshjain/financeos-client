'use client';

import { ChevronDown, ChevronUp } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { InstallmentDto } from '@/lib/types';
import { formatDate, formatMoney } from '@/lib/utils';

interface LoanAmortizationScheduleProps {
  schedule: InstallmentDto[];
  expandedFYs: Record<string, boolean>;
  onToggleFY: (fy: string) => void;
  currentFY: string;
  onOpenMarkPaid: (inst: InstallmentDto) => void;
  onUnlinkPayment: (paymentId: string) => void;
}

export function LoanAmortizationSchedule({
  schedule,
  expandedFYs,
  onToggleFY,
  currentFY,
  onOpenMarkPaid,
  onUnlinkPayment,
}: LoanAmortizationScheduleProps) {
  const getFYGroupKey = (dateStr: string) => {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = date.getMonth();
    const fyStart = month >= 3 ? year : year - 1;
    return `FY ${fyStart}-${(fyStart + 1).toString().slice(-2)}`;
  };

  const fyGroups = schedule.reduce(
    (acc, inst) => {
      const fy = getFYGroupKey(inst.dueDate);
      if (!acc[fy]) acc[fy] = [];
      acc[fy].push(inst);
      return acc;
    },
    {} as Record<string, InstallmentDto[]>
  );

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
        <div>
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Amortization Schedule
          </h2>
          <p className="text-xs text-slate-500">
            Per-EMI interest/principal split computed on demand.
          </p>
        </div>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {Object.entries(fyGroups).map(([fy, items]) => {
          const isExpanded = expandedFYs[fy] ?? fy === currentFY;

          return (
            <div key={fy}>
              <button
                type="button"
                onClick={() => onToggleFY(fy)}
                className="w-full flex items-center justify-between px-4 py-3 bg-slate-50/80 dark:bg-slate-950/60 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span>{fy}</span>
                  <Badge variant="outline" className="text-2xs font-normal">
                    {items.length} EMIs
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-slate-500 font-normal hidden sm:inline">
                    Σ Principal:{' '}
                    {formatMoney(items.reduce((s, i) => s + i.principal, 0))}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4" />
                  ) : (
                    <ChevronDown className="h-4 w-4" />
                  )}
                </div>
              </button>

              {isExpanded && (
                <div>
                  {/* Mobile View: Flat List */}
                  <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800">
                    {items.map((inst) => (
                      <div key={inst.seq} className="p-3.5 space-y-1.5 text-xs">
                        <div className="flex items-center justify-between font-medium">
                          <span>
                            #{inst.seq} · {formatDate(inst.dueDate)}
                          </span>
                          <Badge
                            variant={
                              inst.status === 'settled'
                                ? 'default'
                                : inst.status === 'overdue'
                                  ? 'destructive'
                                  : 'outline'
                            }
                            className="capitalize text-2xs"
                          >
                            {inst.status}
                          </Badge>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <span className="text-slate-500 block">EMI</span>
                            <span className="font-bold">
                              {formatMoney(inst.emi)}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">
                              Interest
                            </span>
                            <span className="text-rose-600 font-medium">
                              {formatMoney(inst.interest)}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-500 block">
                              Principal
                            </span>
                            <span className="text-emerald-600 font-medium">
                              {formatMoney(inst.principal)}
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                          <span className="text-slate-500 text-2xs">
                            Closing: {formatMoney(inst.closingBalance)}
                          </span>
                          {inst.status === 'settled' && inst.payment ? (
                            <Button
                              variant="ghost"
                              size="micro"
                              onClick={() => onUnlinkPayment(inst.payment!.id)}
                              className="text-slate-500 hover:text-rose-600"
                            >
                              Unlink
                            </Button>
                          ) : (
                            <Button
                              variant="outline"
                              size="micro"
                              onClick={() => onOpenMarkPaid(inst)}
                            >
                              Mark Paid
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Desktop View: Table */}
                  <div className="hidden md:block overflow-x-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="bg-slate-50/50 dark:bg-slate-950/40 border-b border-slate-200/80 dark:border-slate-800 font-semibold text-slate-500 uppercase text-2xs">
                          <th className="py-2.5 px-4 w-12 text-center">#</th>
                          <th className="py-2.5 px-4">Due Date</th>
                          <th className="py-2.5 px-4 text-right">
                            Opening Bal
                          </th>
                          <th className="py-2.5 px-4 text-right">EMI</th>
                          <th className="py-2.5 px-4 text-right">Interest</th>
                          <th className="py-2.5 px-4 text-right">Principal</th>
                          <th className="py-2.5 px-4 text-right">
                            Closing Bal
                          </th>
                          <th className="py-2.5 px-4 text-center">Status</th>
                          <th className="py-2.5 px-4 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                        {items.map((inst) => (
                          <tr
                            key={inst.seq}
                            className={
                              inst.status === 'settled'
                                ? 'bg-emerald-500/5 dark:bg-emerald-950/20'
                                : inst.status === 'overdue'
                                  ? 'bg-rose-500/5 dark:bg-rose-950/20'
                                  : ''
                            }
                          >
                            <td className="py-2.5 px-4 text-center font-mono font-medium">
                              {inst.seq}
                            </td>
                            <td className="py-2.5 px-4 font-medium">
                              {formatDate(inst.dueDate)}
                            </td>
                            <td className="py-2.5 px-4 text-right text-slate-500">
                              {formatMoney(inst.openingBalance)}
                            </td>
                            <td className="py-2.5 px-4 text-right font-bold text-slate-900 dark:text-slate-100">
                              {formatMoney(inst.emi)}
                            </td>
                            <td className="py-2.5 px-4 text-right text-rose-600 dark:text-rose-400">
                              {formatMoney(inst.interest)}
                            </td>
                            <td className="py-2.5 px-4 text-right text-emerald-600 dark:text-emerald-400 font-medium">
                              {formatMoney(inst.principal)}
                            </td>
                            <td className="py-2.5 px-4 text-right text-slate-500 font-mono">
                              {formatMoney(inst.closingBalance)}
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              <Badge
                                variant={
                                  inst.status === 'settled'
                                    ? 'default'
                                    : inst.status === 'overdue'
                                      ? 'destructive'
                                      : 'outline'
                                }
                                className="capitalize text-2xs"
                              >
                                {inst.status}
                              </Badge>
                            </td>
                            <td className="py-2.5 px-4 text-right">
                              {inst.status === 'settled' && inst.payment ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() =>
                                    onUnlinkPayment(inst.payment!.id)
                                  }
                                  className="h-6 px-2 text-2xs text-slate-500 hover:text-rose-600"
                                >
                                  Unlink
                                </Button>
                              ) : (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => onOpenMarkPaid(inst)}
                                  className="h-6 px-2 text-2xs"
                                >
                                  Mark Paid
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

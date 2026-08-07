'use client';

import { AlertCircle, Calendar, Edit, Repeat, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

import { deleteSip } from '@/actions/investments';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Broker } from '@/lib/account.types';
import { Position, Sip } from '@/lib/types';
import { formatDate, formatMoney } from '@/lib/utils';

import { SipDialog } from './SipDialog';

interface SipsSectionProps {
  sips: Sip[];
  brokerAccounts: Broker[];
  positions: Position[];
}

export function SipsSection({ sips, brokerAccounts, positions }: SipsSectionProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = async (id: string, name?: string) => {
    if (!confirm(`Are you sure you want to delete the SIP for ${name || 'this instrument'}?`)) return;
    setDeletingId(id);
    try {
      const res = await deleteSip(id);
      if (res.success) {
        toast.success('SIP deleted successfully');
      } else {
        toast.error(res.error.message);
      }
    } catch (err) {
      toast.error('Failed to delete SIP: ' + (err as Error).message);
    } finally {
      setDeletingId(null);
    }
  };

  const getAccountName = (accountId: string) => {
    return brokerAccounts.find((b) => b.id === accountId)?.name || 'Broker';
  };

  return (
    <Card className="bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 shadow-sm">
      <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800 flex flex-row items-center justify-between">
        <CardTitle className="text-base font-bold flex items-center gap-2">
          <Repeat className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          Systematic Investment Plans (SIPs) ({sips.length})
        </CardTitle>
        <SipDialog brokerAccounts={brokerAccounts} positions={positions} />
      </CardHeader>
      <CardContent className="p-4">
        {sips.length === 0 ? (
          <div className="text-center py-8 px-4 space-y-2">
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              No SIPs recorded yet
            </p>
            <p className="text-xs text-slate-500">
              Set up automated recurring investments to track installment progress and execution.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {sips.map((sip) => {
              const prog = sip.progress;
              const hasMissed = prog && prog.missedInstallments > 0;

              return (
                <div
                  key={sip.id}
                  className="p-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/30 space-y-3 flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h4 className="font-bold text-xs text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
                          <span>{sip.instrumentName || 'Instrument'}</span>
                          {sip.symbol && (
                            <span className="text-[10px] text-slate-400 font-normal">({sip.symbol})</span>
                          )}
                        </h4>
                        <p className="text-[10px] text-slate-500">
                          {sip.brokerName || getAccountName(sip.brokerAccountId)}
                        </p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        <Badge
                          variant="outline"
                          className={`text-[9px] px-1.5 py-0 font-bold uppercase ${sip.active ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800' : 'bg-slate-100 text-slate-500 border-slate-200'}`}
                        >
                          {sip.active ? 'Active' : 'Paused'}
                        </Badge>
                      </div>
                    </div>

                    {/* Amount & Frequency */}
                    <div className="flex items-baseline justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                      <div className="text-base font-extrabold text-slate-900 dark:text-white tabular-nums">
                        {formatMoney(sip.amount)}{' '}
                        <span className="text-[10px] font-normal text-slate-500">
                          / {sip.frequency}
                        </span>
                      </div>
                      {prog?.nextDueDate && (
                        <div className="text-[10px] text-slate-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          <span>Due {formatDate(prog.nextDueDate)}</span>
                        </div>
                      )}
                    </div>

                    {/* Progress readout */}
                    {prog && (
                      <div className="space-y-1.5 p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-100 dark:border-slate-800 text-[11px]">
                        <div className="flex items-center justify-between text-[10px]">
                          <span className="text-slate-500 font-medium">Installments</span>
                          <span className="font-bold tabular-nums text-slate-700 dark:text-slate-300">
                            {prog.executedInstallments} / {prog.expectedInstallments}
                          </span>
                        </div>

                        {/* Progress Bar */}
                        <div className="w-full h-1.5 rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                          <div
                            className="h-full bg-blue-600 rounded-full transition-all"
                            style={{
                              width: `${Math.min(
                                100,
                                prog.expectedInstallments > 0
                                  ? (prog.executedInstallments / prog.expectedInstallments) * 100
                                  : 0
                              )}%`,
                            }}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-1 pt-1 text-[10px]">
                          <div>
                            <span className="text-slate-400">Invested: </span>
                            <span className="font-semibold tabular-nums text-slate-700 dark:text-slate-300">
                              {formatMoney(prog.investedSoFar)}
                            </span>
                          </div>
                          <div>
                            <span className="text-slate-400">Avg Cost: </span>
                            <span className="font-semibold tabular-nums text-slate-700 dark:text-slate-300">
                              {formatMoney(prog.avgCost)}
                            </span>
                          </div>
                        </div>

                        {hasMissed && (
                          <div className="pt-1 flex items-center gap-1 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                            <AlertCircle className="w-3 h-3" />
                            <span>{prog.missedInstallments} missed installment(s)</span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Actions Footer */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                    <div className="text-[10px] text-slate-400">
                      Started {formatDate(sip.startDate)}
                    </div>
                    <div className="flex items-center gap-1">
                      <SipDialog
                        brokerAccounts={brokerAccounts}
                        positions={positions}
                        sip={sip}
                        trigger={
                          <Button variant="ghost" size="sm" className="h-6 w-6 p-0 text-slate-500 hover:text-slate-900">
                            <Edit className="w-3.5 h-3.5" />
                          </Button>
                        }
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDelete(sip.id, sip.instrumentName)}
                        disabled={deletingId === sip.id}
                        className="h-6 w-6 p-0 text-red-500 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

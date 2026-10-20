'use client';

import { Plus, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { LoanChargeResponse, LoanEventResponse } from '@/lib/loan.types';
import { formatDate, formatMoney } from '@/lib/utils';

interface LoanEventsAndChargesProps {
  events: LoanEventResponse[];
  charges: LoanChargeResponse[];
  onOpenAddEvent: () => void;
  onOpenAddCharge: () => void;
  onDeleteEvent: (id: string) => void;
  onDeleteCharge: (id: string) => void;
}

export function LoanEventsAndCharges({
  events,
  charges,
  onOpenAddEvent,
  onOpenAddCharge,
  onDeleteEvent,
  onDeleteCharge,
}: LoanEventsAndChargesProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Events */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Lifecycle Events
          </h2>
          <Button size="xs" variant="outline" onClick={onOpenAddEvent}>
            <Plus className="h-3 w-3" /> Add Event
          </Button>
        </div>
        <div className="p-4 space-y-2 text-xs">
          {events.length === 0 ? (
            <p className="text-slate-400 italic">
              No lifecycle events recorded.
            </p>
          ) : (
            events.map((evt) => (
              <div
                key={evt.id}
                className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950"
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="capitalize text-2xs">
                      {evt.eventType.replace('_', ' ')}
                    </Badge>
                    <span className="font-bold">
                      {formatDate(evt.effectiveDate)}
                    </span>
                  </div>
                  <div className="text-slate-500 text-xs">
                    {evt.eventType === 'rate_change' &&
                      `New Rate: ${evt.newAnnualRatePct}% (${evt.adjustmentMode})`}
                    {evt.eventType === 'prepayment' &&
                      `Amount: ${formatMoney(evt.amount)} (${evt.adjustmentMode})`}
                    {evt.eventType === 'foreclosure' &&
                      `Foreclosure Paid: ${formatMoney(evt.amount)}`}
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => onDeleteEvent(evt.id)}
                  className="text-slate-400 hover:text-rose-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Charges */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">
            Itemized Charges
          </h2>
          <Button size="xs" variant="outline" onClick={onOpenAddCharge}>
            <Plus className="h-3 w-3" /> Add Charge
          </Button>
        </div>
        <div className="p-4 space-y-2 text-xs">
          {charges.length === 0 ? (
            <p className="text-slate-400 italic">No charges recorded.</p>
          ) : (
            charges.map((chg) => (
              <div
                key={chg.id}
                className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="capitalize text-2xs">
                      {chg.chargeType.replace('_', ' ')}
                    </Badge>
                    <span className="font-bold text-rose-600">
                      {formatMoney(chg.amount)}
                    </span>
                    <span className="text-slate-500">
                      · {formatDate(chg.chargeDate)}
                    </span>
                  </div>
                  {chg.notes && (
                    <p className="text-slate-500 text-xs">{chg.notes}</p>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => onDeleteCharge(chg.id)}
                  className="text-slate-400 hover:text-rose-600"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

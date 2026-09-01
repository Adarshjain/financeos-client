'use client';

import { CalendarDays, ChevronDown, Gift } from 'lucide-react';

import { DatePicker } from '@/components/ui/date-picker';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { TransactionChannel } from '@/lib/transaction.types';
import { cn, formatDate, sanitizeDecimalInput, toCalendarDate } from '@/lib/utils';

import { CHANNEL_LABELS } from './constants';

interface RewardsDetailsSectionProps {
  showRewardDetails: boolean;
  setShowRewardDetails: React.Dispatch<React.SetStateAction<boolean>>;
  hasRewardDetails: boolean;
  settlementDate?: Date;
  setSettlementDate: (date?: Date) => void;
  instantDiscount: string;
  setInstantDiscount: (val: string) => void;
  convenienceFee: string;
  setConvenienceFee: (val: string) => void;
  channel: TransactionChannel | 'NONE';
  setChannel: (channel: TransactionChannel | 'NONE') => void;
  isEmi: boolean;
  setIsEmi: React.Dispatch<React.SetStateAction<boolean>>;
  isInternational: boolean;
  setIsInternational: React.Dispatch<React.SetStateAction<boolean>>;
}

export function RewardsDetailsSection({
  showRewardDetails,
  setShowRewardDetails,
  hasRewardDetails,
  settlementDate,
  setSettlementDate,
  instantDiscount,
  setInstantDiscount,
  convenienceFee,
  setConvenienceFee,
  channel,
  setChannel,
  isEmi,
  setIsEmi,
  isInternational,
  setIsInternational,
}: RewardsDetailsSectionProps) {
  return (
    <div className="bg-white dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800/80 shadow-sm">
      <button
        type="button"
        onClick={() => setShowRewardDetails((prev) => !prev)}
        aria-expanded={showRewardDetails}
        className="w-full flex items-center justify-between p-3.5"
      >
        <Label className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium pointer-events-none">
          <Gift className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
          Rewards Details
          {!showRewardDetails && hasRewardDetails && (
            <span className="text-2xs text-emerald-600 dark:text-emerald-400 font-semibold">
              • has values
            </span>
          )}
        </Label>
        <ChevronDown
          className={cn(
            'w-3.5 h-3.5 text-slate-400 dark:text-slate-500 transition-transform',
            showRewardDetails && 'rotate-180'
          )}
        />
      </button>
      {showRewardDetails && (
        <div className="px-3.5 pb-3.5 flex flex-col gap-3">
          {/* Settlement Date */}
          <div className="flex items-center justify-between gap-2">
            <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium shrink-0">
              Settlement Date
            </Label>
            <div className="flex items-center gap-1.5">
              <DatePicker
                date={settlementDate}
                onSelect={setSettlementDate}
                trigger={
                  <button
                    type="button"
                    className="flex items-center gap-1.5 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 text-xs px-3 h-9 border border-slate-200 dark:border-slate-800 rounded-lg font-semibold hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
                  >
                    <CalendarDays className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
                    {settlementDate
                      ? formatDate(toCalendarDate(settlementDate))
                      : 'Not set'}
                  </button>
                }
              />
              {settlementDate && (
                <button
                  type="button"
                  aria-label="Clear settlement date"
                  onClick={() => setSettlementDate(undefined)}
                  className="text-2xs text-slate-400 dark:text-slate-500 hover:text-rose-500 font-semibold px-1"
                >
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Instant Discount + Convenience Fee */}
          <div className="grid grid-cols-2 gap-2.5">
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Instant Discount
              </Label>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="₹ 0.00"
                value={instantDiscount}
                onChange={(e) =>
                  setInstantDiscount(sanitizeDecimalInput(e.target.value))
                }
                className="text-xs h-9 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-lg shadow-none"
              />
              <span className="text-2xs text-slate-400 dark:text-slate-500">
                Checkout discount, never charged
              </span>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Convenience Fee
              </Label>
              <Input
                type="text"
                inputMode="decimal"
                placeholder="₹ 0.00"
                value={convenienceFee}
                onChange={(e) =>
                  setConvenienceFee(sanitizeDecimalInput(e.target.value))
                }
                className="text-xs h-9 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-lg shadow-none"
              />
              <span className="text-2xs text-slate-400 dark:text-slate-500">
                Fee portion of the amount
              </span>
            </div>
          </div>

          {/* Channel */}
          <div className="flex items-center justify-between gap-2">
            <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium shrink-0">
              Channel
            </Label>
            <Select
              name="channel"
              value={channel}
              onValueChange={(val) => setChannel(val as TransactionChannel | 'NONE')}
            >
              <SelectTrigger className="w-44 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 text-xs px-3 h-9 border border-slate-200 dark:border-slate-800 rounded-lg font-semibold shadow-none hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors">
                <SelectValue placeholder="Not set" />
              </SelectTrigger>
              <SelectContent className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
                <SelectItem
                  value="NONE"
                  className="text-xs hover:bg-slate-50 dark:hover:bg-slate-900"
                >
                  Not set
                </SelectItem>
                {(Object.keys(CHANNEL_LABELS) as TransactionChannel[]).map((c) => (
                  <SelectItem
                    key={c}
                    value={c}
                    className="text-xs hover:bg-slate-50 dark:hover:bg-slate-900"
                  >
                    {CHANNEL_LABELS[c]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* EMI Toggle */}
          <div className="flex items-center justify-between py-0.5 border-t border-slate-100 dark:border-slate-800/50 pt-2.5">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                EMI Transaction
              </span>
              <span className="text-2xs text-slate-400 dark:text-slate-500">
                Converted to or made as EMI
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isEmi}
              aria-label="EMI transaction"
              onClick={() => setIsEmi((prev) => !prev)}
              className={cn(
                'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                isEmi ? 'bg-violet-500' : 'bg-slate-200 dark:bg-slate-800'
              )}
            >
              <span
                className={cn(
                  'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out',
                  isEmi ? 'translate-x-4' : 'translate-x-0'
                )}
              />
            </button>
          </div>

          {/* International Toggle */}
          <div className="flex items-center justify-between py-0.5 border-t border-slate-100 dark:border-slate-800/50 pt-2.5">
            <div className="flex flex-col gap-0.5">
              <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">
                International
              </span>
              <span className="text-2xs text-slate-400 dark:text-slate-500">
                Foreign-currency / overseas spend
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={isInternational}
              aria-label="International transaction"
              onClick={() => setIsInternational((prev) => !prev)}
              className={cn(
                'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1',
                isInternational ? 'bg-sky-500' : 'bg-slate-200 dark:bg-slate-800'
              )}
            >
              <span
                className={cn(
                  'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out',
                  isInternational ? 'translate-x-4' : 'translate-x-0'
                )}
              />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

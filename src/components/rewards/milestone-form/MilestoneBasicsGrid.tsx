'use client';

import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AccountCard } from '@/lib/account.types';
import {
  MilestoneBasis,
  MilestonePayoutTiming,
  MilestonePayoutType,
  MilestoneWindow,
  RewardType,
} from '@/lib/rewards.types';
import { parseCalendarDate, sanitizeDecimalInput } from '@/lib/utils';

import { MilestonePayoutSection } from './MilestonePayoutSection';

export const WINDOW_LABELS: Record<MilestoneWindow, string> = {
  CALENDAR_MONTH: 'Calendar month',
  STATEMENT_CYCLE: 'Statement cycle',
  QUARTER: 'Quarter',
  CALENDAR_YEAR: 'Calendar year',
  ANNIVERSARY_YEAR: 'Anniversary year',
  ONE_TIME: 'One-time (welcome offer)',
};

export const selectTriggerClass =
  'w-full bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 text-xs px-3 h-9 border border-slate-200 dark:border-slate-800 rounded-lg font-semibold shadow-none hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors';
export const inputClass =
  'text-xs h-9 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-lg shadow-none';

interface MilestoneBasicsGridProps {
  name: string;
  setName: (n: string) => void;
  windowType: MilestoneWindow;
  setWindowType: (w: MilestoneWindow) => void;
  cards?: AccountCard[];
  cardId: string | null;
  setCardId: (id: string | null) => void;
  setActiveFrom: (d?: Date) => void;
  setActiveTo: (d?: Date) => void;
  basis: MilestoneBasis;
  setBasis: (b: MilestoneBasis) => void;
  threshold: string;
  setThreshold: (t: string) => void;
  minTxnAmount: string;
  setMinTxnAmount: (m: string) => void;
  payoutType: MilestonePayoutType;
  setPayoutType: (p: MilestonePayoutType) => void;
  rewardType: RewardType;
  setRewardType: (r: RewardType) => void;
  payoutValue: string;
  setPayoutValue: (v: string) => void;
  payoutTiming: MilestonePayoutTiming;
  setPayoutTiming: (t: MilestonePayoutTiming) => void;
  isBank?: boolean;
}

export function MilestoneBasicsGrid({
  name,
  setName,
  windowType,
  setWindowType,
  cards,
  cardId,
  setCardId,
  setActiveFrom,
  setActiveTo,
  basis,
  setBasis,
  threshold,
  setThreshold,
  minTxnAmount,
  setMinTxnAmount,
  payoutType,
  setPayoutType,
  rewardType,
  setRewardType,
  payoutValue,
  setPayoutValue,
  payoutTiming,
  setPayoutTiming,
  isBank,
}: MilestoneBasicsGridProps) {
  return (
    <div className="grid grid-cols-2 gap-2.5">
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Name
        </Label>
        <Input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. ₹50k quarterly voucher"
          className={inputClass}
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Window
        </Label>
        <Select
          value={windowType}
          onValueChange={(v) => setWindowType(v as MilestoneWindow)}
        >
          <SelectTrigger className={selectTriggerClass}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {(Object.keys(WINDOW_LABELS) as MilestoneWindow[]).map((w) => (
              <SelectItem key={w} value={w} className="text-xs">
                {WINDOW_LABELS[w]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      {cards && cards.length > 0 && (
        <div className="flex flex-col gap-1 col-span-2">
          <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Cardholder Scope
          </Label>
          <Select
            value={cardId || 'ALL'}
            onValueChange={(v) => {
              const newCardId = v === 'ALL' ? null : v;
              setCardId(newCardId);
              if (newCardId && windowType === 'ONE_TIME') {
                const selectedCard = cards.find((c) => c.id === newCardId);
                const cardIssuedOn =
                  selectedCard?.cards?.[0]?.issuedOn || selectedCard?.openedOn;
                if (cardIssuedOn) {
                  const issued = parseCalendarDate(cardIssuedOn);
                  setActiveFrom(issued);
                  const end = new Date(issued);
                  end.setDate(end.getDate() + 90);
                  setActiveTo(end);
                }
              }
            }}
          >
            <SelectTrigger className={selectTriggerClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL" className="text-xs">
                All Cardholders (Account-level)
              </SelectItem>
              {cards.map((c) => {
                const cName =
                  c.personName || (c.role === 'PRIMARY' ? 'Primary' : (isBank ? 'Joint holder' : 'Add-on'));
                const last4 = c.currentLast4 || c.cards?.[0]?.last4 || '';
                return (
                  <SelectItem key={c.id} value={c.id} className="text-xs">
                    {cName} {last4 ? `(•••• ${last4})` : ''}
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        </div>
      )}
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Counts
        </Label>
        <Select
          value={basis}
          onValueChange={(v) => setBasis(v as MilestoneBasis)}
        >
          <SelectTrigger className={selectTriggerClass}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="SPEND" className="text-xs">
              Eligible spend (₹)
            </SelectItem>
            <SelectItem value="TXN_COUNT" className="text-xs">
              Transaction count
            </SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Threshold {basis === 'SPEND' ? '₹' : '(txns)'}
        </Label>
        <Input
          inputMode="decimal"
          value={threshold}
          onChange={(e) =>
            setThreshold(sanitizeDecimalInput(e.target.value))
          }
          placeholder={basis === 'SPEND' ? 'e.g. 50000' : 'e.g. 4'}
          className={inputClass}
        />
      </div>
      {basis === 'TXN_COUNT' && (
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Min txn amount ₹
          </Label>
          <Input
            inputMode="decimal"
            value={minTxnAmount}
            onChange={(e) =>
              setMinTxnAmount(sanitizeDecimalInput(e.target.value))
            }
            placeholder="e.g. 1500 (optional)"
            className={inputClass}
          />
        </div>
      )}
      <MilestonePayoutSection
        payoutType={payoutType}
        setPayoutType={setPayoutType}
        rewardType={rewardType}
        setRewardType={setRewardType}
        payoutValue={payoutValue}
        setPayoutValue={setPayoutValue}
        payoutTiming={payoutTiming}
        setPayoutTiming={setPayoutTiming}
        selectTriggerClass={selectTriggerClass}
        inputClass={inputClass}
      />
    </div>
  );
}

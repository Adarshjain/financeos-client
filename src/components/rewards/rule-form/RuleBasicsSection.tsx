'use client';

import { CalendarDays } from 'lucide-react';

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
import { AccountCard } from '@/lib/account.types';
import { CounterScope, RuleStacking } from '@/lib/rewards.types';
import { cn, formatDate, toCalendarDate } from '@/lib/utils';

import {
  inputClass,
  sectionClass,
  selectTriggerClass,
} from './constants';

interface RuleBasicsSectionProps {
  name: string;
  setName: (name: string) => void;
  stacking: RuleStacking;
  setStacking: (stacking: RuleStacking) => void;
  cards?: AccountCard[];
  cardId: string | null;
  setCardId: (id: string | null) => void;
  counterScope: CounterScope;
  setCounterScope: (scope: CounterScope) => void;
  activeFrom?: Date;
  setActiveFrom: (date?: Date) => void;
  activeTo?: Date;
  setActiveTo: (date?: Date) => void;
  isBank?: boolean;
}

export function RuleBasicsSection({
  name,
  setName,
  stacking,
  setStacking,
  cards,
  cardId,
  setCardId,
  counterScope,
  setCounterScope,
  activeFrom,
  setActiveFrom,
  activeTo,
  setActiveTo,
  isBank,
}: RuleBasicsSectionProps) {
  const dateTrigger = (date: Date | undefined, placeholder: string) => (
    <button
      type="button"
      className={cn(selectTriggerClass, 'flex items-center gap-1.5 w-auto')}
    >
      <CalendarDays className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
      {date ? formatDate(toCalendarDate(date)) : placeholder}
    </button>
  );

  return (
    <div className={sectionClass}>
      <div className="grid grid-cols-2 gap-2.5">
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Name
          </Label>
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. 5% online"
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Stacking
          </Label>
          <Select
            value={stacking}
            onValueChange={(v) => setStacking(v as RuleStacking)}
          >
            <SelectTrigger className={selectTriggerClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="EXCLUSIVE" className="text-xs">
                Exclusive (first match wins)
              </SelectItem>
              <SelectItem value="ADDITIVE" className="text-xs">
                Additive (bonus on top)
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      {cards && cards.length > 0 && (
        <div className="grid grid-cols-2 gap-2.5 pt-1 border-t border-slate-100 dark:border-slate-800">
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Card Scope
            </Label>
            <Select
              value={cardId || 'ALL'}
              onValueChange={(v) => setCardId(v === 'ALL' ? null : v)}
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
          <div className="flex flex-col gap-1">
            <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">
              Counter Scope
            </Label>
            <Select
              value={counterScope}
              onValueChange={(v) => setCounterScope(v as CounterScope)}
            >
              <SelectTrigger className={selectTriggerClass}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACCOUNT" className="text-xs">
                  Account-wide Counter
                </SelectItem>
                <SelectItem value="PER_CARDHOLDER" className="text-xs">
                  Per-Cardholder Counter
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}
      <div className="flex items-center gap-2 flex-wrap">
        <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Active
        </Label>
        <DatePicker
          date={activeFrom}
          onSelect={setActiveFrom}
          trigger={dateTrigger(activeFrom, 'Always')}
        />
        {activeFrom && (
          <button
            type="button"
            onClick={() => setActiveFrom(undefined)}
            className="text-2xs text-slate-400 hover:text-rose-500 font-semibold"
          >
            Clear
          </button>
        )}
        <span className="text-2xs text-slate-400">→</span>
        <DatePicker
          date={activeTo}
          onSelect={setActiveTo}
          trigger={dateTrigger(activeTo, 'Open-ended')}
        />
        {activeTo && (
          <button
            type="button"
            onClick={() => setActiveTo(undefined)}
            className="text-2xs text-slate-400 hover:text-rose-500 font-semibold"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}

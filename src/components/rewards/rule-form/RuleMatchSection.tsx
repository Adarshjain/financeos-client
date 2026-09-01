'use client';

import { Combobox } from '@/components/Combobox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Category } from '@/lib/categories.types';
import {
  DayOfWeek,
  EmiTreatment,
  FeeTreatment,
  IntlTreatment,
  RewardMerchantMatch,
} from '@/lib/rewards.types';
import { TransactionChannel } from '@/lib/transaction.types';
import { sanitizeDecimalInput } from '@/lib/utils';

import {
  CHANNEL_OPTIONS,
  chipClass,
  DAY_OPTIONS,
  inputClass,
  MERCHANT_MATCH_LABELS,
  sectionClass,
  sectionTitleClass,
  selectTriggerClass,
} from './constants';

interface RuleMatchSectionProps {
  categories: Category[];
  selectedCategories: Category[];
  setSelectedCategories: React.Dispatch<React.SetStateAction<Category[]>>;
  mccText: string;
  setMccText: (text: string) => void;
  merchantPattern: string;
  setMerchantPattern: (p: string) => void;
  merchantMatch: RewardMerchantMatch | 'NONE';
  setMerchantMatch: (m: RewardMerchantMatch | 'NONE') => void;
  channels: TransactionChannel[];
  setChannels: React.Dispatch<React.SetStateAction<TransactionChannel[]>>;
  daysOfWeek: DayOfWeek[];
  setDaysOfWeek: React.Dispatch<React.SetStateAction<DayOfWeek[]>>;
  minAmount: string;
  setMinAmount: (a: string) => void;
  maxAmount: string;
  setMaxAmount: (a: string) => void;
  emiTreatment: EmiTreatment;
  setEmiTreatment: (t: EmiTreatment) => void;
  intlTreatment: IntlTreatment;
  setIntlTreatment: (t: IntlTreatment) => void;
  feeTreatment: FeeTreatment;
  setFeeTreatment: (t: FeeTreatment) => void;
}

export function RuleMatchSection({
  categories,
  selectedCategories,
  setSelectedCategories,
  mccText,
  setMccText,
  merchantPattern,
  setMerchantPattern,
  merchantMatch,
  setMerchantMatch,
  channels,
  setChannels,
  daysOfWeek,
  setDaysOfWeek,
  minAmount,
  setMinAmount,
  maxAmount,
  setMaxAmount,
  emiTreatment,
  setEmiTreatment,
  intlTreatment,
  setIntlTreatment,
  feeTreatment,
  setFeeTreatment,
}: RuleMatchSectionProps) {
  const toggleIn = <T,>(list: T[], item: T): T[] =>
    list.includes(item) ? list.filter((x) => x !== item) : [...list, item];

  return (
    <div className={sectionClass}>
      <span className={sectionTitleClass}>
        Match — leave everything empty to match all spends
      </span>
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Categories <span className="text-slate-400">(OR with MCCs)</span>
        </Label>
        <Combobox
          options={categories}
          value={selectedCategories}
          onChange={setSelectedCategories}
        />
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          MCC codes
        </Label>
        <Input
          value={mccText}
          onChange={(e) => setMccText(e.target.value)}
          placeholder="Comma-separated, e.g. 5812, 5814"
          className={inputClass}
        />
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Merchant pattern
          </Label>
          <Input
            value={merchantPattern}
            onChange={(e) => setMerchantPattern(e.target.value)}
            placeholder="e.g. swiggy"
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Match type
          </Label>
          <Select
            value={merchantMatch}
            onValueChange={(v) =>
              setMerchantMatch(v as RewardMerchantMatch | 'NONE')
            }
          >
            <SelectTrigger className={selectTriggerClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="NONE" className="text-xs">
                —
              </SelectItem>
              {(
                Object.keys(MERCHANT_MATCH_LABELS) as RewardMerchantMatch[]
              ).map((m) => (
                <SelectItem key={m} value={m} className="text-xs">
                  {MERCHANT_MATCH_LABELS[m]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Channels
        </Label>
        <div className="flex gap-1.5 flex-wrap">
          {CHANNEL_OPTIONS.map((c) => (
            <button
              key={c.value}
              type="button"
              onClick={() => setChannels((prev) => toggleIn(prev, c.value))}
              className={chipClass(channels.includes(c.value))}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Days of week
        </Label>
        <div className="flex gap-1.5 flex-wrap">
          {DAY_OPTIONS.map((d) => (
            <button
              key={d.value}
              type="button"
              onClick={() => setDaysOfWeek((prev) => toggleIn(prev, d.value))}
              className={chipClass(daysOfWeek.includes(d.value))}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Min amount
          </Label>
          <Input
            inputMode="decimal"
            value={minAmount}
            onChange={(e) => setMinAmount(sanitizeDecimalInput(e.target.value))}
            placeholder="₹"
            className={inputClass}
          />
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            Max amount
          </Label>
          <Input
            inputMode="decimal"
            value={maxAmount}
            onChange={(e) => setMaxAmount(sanitizeDecimalInput(e.target.value))}
            placeholder="₹"
            className={inputClass}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            EMI spends
          </Label>
          <Select
            value={emiTreatment}
            onValueChange={(v) => setEmiTreatment(v as EmiTreatment)}
          >
            <SelectTrigger className={selectTriggerClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="INCLUDE" className="text-xs">
                Include
              </SelectItem>
              <SelectItem value="EXCLUDE_EMI" className="text-xs">
                Exclude EMI
              </SelectItem>
              <SelectItem value="ONLY_EMI" className="text-xs">
                Only EMI
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex flex-col gap-1">
          <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">
            International
          </Label>
          <Select
            value={intlTreatment}
            onValueChange={(v) => setIntlTreatment(v as IntlTreatment)}
          >
            <SelectTrigger className={selectTriggerClass}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="INCLUDE" className="text-xs">
                Include
              </SelectItem>
              <SelectItem value="EXCLUDE_INTL" className="text-xs">
                Exclude international
              </SelectItem>
              <SelectItem value="ONLY_INTL" className="text-xs">
                Only international
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="flex flex-col gap-1">
        <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">
          Convenience fee
        </Label>
        <Select
          value={feeTreatment}
          onValueChange={(v) => setFeeTreatment(v as FeeTreatment)}
        >
          <SelectTrigger className={selectTriggerClass}>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="INCLUDE" className="text-xs">
              Earns like the rest of the spend
            </SelectItem>
            <SelectItem value="EXCLUDE_FEE" className="text-xs">
              Netted out of the basis
            </SelectItem>
          </SelectContent>
        </Select>
        <span className="text-2xs text-slate-400 dark:text-slate-500">
          Most issuers post the surcharge to the card but award nothing on it.
        </span>
      </div>
    </div>
  );
}

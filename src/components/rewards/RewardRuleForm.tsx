'use client';

import { CalendarDays } from 'lucide-react';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { createRewardRule, updateRewardRule } from '@/actions/rewards';
import { Combobox } from '@/components/Combobox';
import { Button } from '@/components/ui/button';
import { DatePicker } from '@/components/ui/date-picker';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { Category } from '@/lib/categories.types';
import type {
  AccrualType,
  CapExhaustedBehavior,
  CapWindow,
  CashbackRounding,
  DayOfWeek,
  EmiTreatment,
  IntlTreatment,
  FeeTreatment,
  RewardCapBucket,
  RewardMerchantMatch,
  RewardRule,
  RewardRuleRequest,
  RewardType,
  RuleStacking,
} from '@/lib/rewards.types';
import type { TransactionChannel } from '@/lib/transaction.types';
import { cn, formatDate, formatMoney, parseCalendarDate, sanitizeDecimalInput, toCalendarDate } from '@/lib/utils';

const CHANNEL_OPTIONS: { value: TransactionChannel; label: string }[] = [
  { value: 'ONLINE', label: 'Online' },
  { value: 'POS', label: 'POS' },
  { value: 'UPI', label: 'UPI' },
  { value: 'CONTACTLESS', label: 'Tap' },
  { value: 'OTHER', label: 'Other' },
];

const DAY_OPTIONS: { value: DayOfWeek; label: string }[] = [
  { value: 'MONDAY', label: 'Mon' },
  { value: 'TUESDAY', label: 'Tue' },
  { value: 'WEDNESDAY', label: 'Wed' },
  { value: 'THURSDAY', label: 'Thu' },
  { value: 'FRIDAY', label: 'Fri' },
  { value: 'SATURDAY', label: 'Sat' },
  { value: 'SUNDAY', label: 'Sun' },
];

const MERCHANT_MATCH_LABELS: Record<RewardMerchantMatch, string> = {
  CONTAINS: 'Contains',
  STARTS_WITH: 'Starts with',
  EXACT: 'Exact',
  REGEX: 'Regex',
};

const CAP_WINDOW_LABELS: Record<CapWindow, string> = {
  DAY: 'Per day',
  CALENDAR_MONTH: 'Per calendar month',
  STATEMENT_CYCLE: 'Per statement cycle',
  QUARTER: 'Per quarter',
  CALENDAR_YEAR: 'Per calendar year',
  ANNIVERSARY_YEAR: 'Per anniversary year',
};

function numOrNull(value: string): number | null {
  return value.trim() ? Number(value) : null;
}

interface RewardRuleFormProps {
  accountId: string;
  categories: Category[];
  capBuckets: RewardCapBucket[];
  /** The card's default reward currency — preselected for new rules. */
  defaultRewardType: RewardType;
  /** Editing this rule; undefined = create. */
  rule?: RewardRule;
  /** Prefill from this rule but create new (end-date & clone flow). */
  cloneFrom?: RewardRule;
  defaultPriority: number;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function RewardRuleForm({
  accountId,
  categories,
  capBuckets,
  defaultRewardType,
  rule,
  cloneFrom,
  defaultPriority,
  open,
  onClose,
  onSaved,
}: RewardRuleFormProps) {
  const source = rule ?? cloneFrom;
  const isUpdateMode = !!rule;

  const [name, setName] = useState(source?.name ?? '');
  const [stacking, setStacking] = useState<RuleStacking>(source?.stacking ?? 'EXCLUSIVE');
  // Defaults: brand-new rule = no start date ("Always") so past transactions count;
  // a CLONE starts where its predecessor ended (or today) — never "Always", which
  // would retroactively overlap the end-dated predecessor and rewrite history.
  const [activeFrom, setActiveFrom] = useState<Date | undefined>(
    rule?.activeFrom ? parseCalendarDate(rule.activeFrom)
      : rule ? undefined
      : cloneFrom ? (cloneFrom.activeTo ? parseCalendarDate(cloneFrom.activeTo) : new Date())
      : undefined,
  );
  const [activeTo, setActiveTo] = useState<Date | undefined>(
    rule?.activeTo ? parseCalendarDate(rule.activeTo) : undefined,
  );
  const [selectedCategories, setSelectedCategories] = useState<Category[]>(
    source ? source.categories.map((c) => categories.find((x) => x.id === c.id) ?? c) : [],
  );
  const [mccText, setMccText] = useState(source?.mccs.join(', ') ?? '');
  const [channels, setChannels] = useState<TransactionChannel[]>(source?.channels ?? []);
  const [daysOfWeek, setDaysOfWeek] = useState<DayOfWeek[]>(source?.daysOfWeek ?? []);
  const [merchantPattern, setMerchantPattern] = useState(source?.merchantPattern ?? '');
  const [merchantMatch, setMerchantMatch] = useState<RewardMerchantMatch | 'NONE'>(
    source?.merchantMatch ?? 'NONE',
  );
  const [minAmount, setMinAmount] = useState(source?.minAmount != null ? String(source.minAmount) : '');
  const [maxAmount, setMaxAmount] = useState(source?.maxAmount != null ? String(source.maxAmount) : '');
  const [emiTreatment, setEmiTreatment] = useState<EmiTreatment>(source?.emiTreatment ?? 'INCLUDE');
  const [intlTreatment, setIntlTreatment] = useState<IntlTreatment>(source?.intlTreatment ?? 'INCLUDE');
  const [feeTreatment, setFeeTreatment] = useState<FeeTreatment>(source?.feeTreatment ?? 'INCLUDE');

  // The rule computes a NUMBER (percent or slab math); the reward type says whether
  // that number is cashback rupees or reward points. Defaulted from the card config.
  const [rewardType, setRewardType] = useState<RewardType>(source?.rewardType ?? defaultRewardType);
  const [accrualType, setAccrualType] = useState<AccrualType>(source?.accrualType ?? 'PERCENT');
  const [percentRate, setPercentRate] = useState(
    source?.percentRate != null ? String(source.percentRate) : '',
  );
  const [rounding, setRounding] = useState<CashbackRounding>(source?.rounding ?? 'NONE');
  const [slabSize, setSlabSize] = useState(source?.slabSize != null ? String(source.slabSize) : '');
  const [pointsPerSlab, setPointsPerSlab] = useState(
    source?.pointsPerSlab != null ? String(source.pointsPerSlab) : '',
  );
  const [pointPrecision, setPointPrecision] = useState<string>(
    source?.pointPrecision != null ? String(source.pointPrecision) : '0',
  );

  // Tiered (marginal) rate — rate steps as the rule's matched spend grows in a window.
  const [isTiered, setIsTiered] = useState((source?.tiers?.length ?? 0) > 0);
  const [tierWindow, setTierWindow] = useState<CapWindow>(source?.tierWindow ?? 'CALENDAR_MONTH');
  const [tierRows, setTierRows] = useState<{ upTo: string; rate: string }[]>(
    source?.tiers?.length
      ? source.tiers.map((t) => ({ upTo: t.upTo != null ? String(t.upTo) : '', rate: String(t.rate) }))
      : [{ upTo: '20000', rate: '' }, { upTo: '', rate: '' }],
  );

  const [perTxnCap, setPerTxnCap] = useState(source?.perTxnCap != null ? String(source.perTxnCap) : '');
  // Period-cap mode: none, this rule's own cap, or a shared bucket.
  const [capMode, setCapMode] = useState<'NONE' | 'OWN' | 'BUCKET'>(
    source?.capBucketId ? 'BUCKET' : source?.periodCap != null ? 'OWN' : 'NONE',
  );
  const [periodCap, setPeriodCap] = useState(source?.periodCap != null ? String(source.periodCap) : '');
  const [capWindow, setCapWindow] = useState<CapWindow>(source?.capWindow ?? 'CALENDAR_MONTH');
  const [capBucketId, setCapBucketId] = useState<string>(source?.capBucketId ?? '');
  const [onCapExhausted, setOnCapExhausted] = useState<CapExhaustedBehavior>(
    source?.onCapExhausted ?? 'FALL_THROUGH',
  );

  // "Test this rule" sample transaction (date deliberately excluded — active-range
  // and day-of-week conditions aren't simulated).
  const [previewAmount, setPreviewAmount] = useState('1000');
  const [previewDescription, setPreviewDescription] = useState('');
  const [previewMcc, setPreviewMcc] = useState('');
  const [previewChannel, setPreviewChannel] = useState<TransactionChannel | 'NONE'>('NONE');
  const [previewCategories, setPreviewCategories] = useState<Category[]>([]);
  const [previewEmi, setPreviewEmi] = useState(false);
  const [previewIntl, setPreviewIntl] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const preview = useMemo((): { matched: boolean; text: string } | null => {
    const amount = Number(previewAmount);
    if (!previewAmount.trim() || Number.isNaN(amount) || amount <= 0) return null;

    // --- match phase (mirrors the server's predicate semantics) ---
    const ruleMccs = mccText.split(',').map((m) => m.trim()).filter(Boolean);
    const hasCategoryPredicate = selectedCategories.length > 0;
    const hasMccPredicate = ruleMccs.length > 0;
    if (hasCategoryPredicate || hasMccPredicate) {
      const categoryHit = hasCategoryPredicate
        && previewCategories.some((pc) => selectedCategories.some((sc) => sc.id === pc.id));
      const mccHit = hasMccPredicate && !!previewMcc.trim() && ruleMccs.includes(previewMcc.trim());
      if (!categoryHit && !mccHit) {
        return { matched: false, text: 'No match — category/MCC not covered by this rule' };
      }
    }
    const pattern = merchantPattern.trim().toLowerCase();
    if (pattern && merchantMatch !== 'NONE') {
      const haystack = previewDescription.trim().toLowerCase();
      // null = the pattern can't be compiled in the browser (JS vs Java regex dialects)
      const hit: boolean | null = !haystack ? false
        : merchantMatch === 'CONTAINS' ? haystack.includes(pattern)
        : merchantMatch === 'STARTS_WITH' ? haystack.startsWith(pattern)
        : merchantMatch === 'EXACT' ? haystack === pattern
        : (() => { try { return new RegExp(merchantPattern.trim(), 'i').test(previewDescription); } catch { return null; } })();
      if (hit === null) {
        return { matched: false, text: 'Can’t test this regex in the browser (Java-only syntax) — verify via the report' };
      }
      if (!hit) return { matched: false, text: 'No match — description doesn’t match the merchant pattern' };
    }
    if (channels.length > 0 && (previewChannel === 'NONE' || !channels.includes(previewChannel))) {
      return { matched: false, text: 'No match — channel not covered by this rule' };
    }
    if (minAmount.trim() && amount < Number(minAmount)) {
      return { matched: false, text: `No match — below minimum amount ₹${minAmount}` };
    }
    if (maxAmount.trim() && amount > Number(maxAmount)) {
      return { matched: false, text: `No match — above maximum amount ₹${maxAmount}` };
    }
    if (emiTreatment === 'EXCLUDE_EMI' && previewEmi) return { matched: false, text: 'No match — EMI spends are excluded' };
    if (emiTreatment === 'ONLY_EMI' && !previewEmi) return { matched: false, text: 'No match — rule applies to EMI spends only' };
    if (intlTreatment === 'EXCLUDE_INTL' && previewIntl) return { matched: false, text: 'No match — international spends are excluded' };
    if (intlTreatment === 'ONLY_INTL' && !previewIntl) return { matched: false, text: 'No match — rule applies to international spends only' };

    // --- accrual phase ---
    const slab = Number(slabSize);
    const precision = Number(pointPrecision) || 0;
    const factor = Math.pow(10, precision);
    // The accrued number is paid in the rule's reward currency.
    const paid = (n: number) => {
      const display = Math.round(n * 100) / 100;
      return rewardType === 'POINTS' ? `${display} pts` : `${formatMoney(display)} cashback`;
    };

    if (isTiered) {
      // Marginal tranches from a window position of ₹0 (real progress isn't known here).
      if (tierRows.some((t) => !t.rate.trim())) return null;
      let remaining = amount;
      let position = 0;
      let total = 0;
      for (let i = 0; i < tierRows.length && remaining > 0; i++) {
        const last = i === tierRows.length - 1;
        const upTo = last ? Infinity : Number(tierRows[i].upTo);
        if (!last && (!tierRows[i].upTo.trim() || Number.isNaN(upTo))) return null;
        const headroom = upTo - position;
        if (headroom <= 0) continue;
        const tranche = Math.min(remaining, headroom);
        const rate = Number(tierRows[i].rate);
        if (accrualType === 'PERCENT') {
          total += (tranche * rate) / 100;
        } else {
          if (!slabSize.trim() || Number.isNaN(slab) || slab <= 0) return null;
          total += Math.floor(tranche / slab) * rate;
        }
        position += tranche;
        remaining -= tranche;
      }
      if (accrualType === 'PERCENT') {
        if (rounding === 'FLOOR_RUPEE') total = Math.floor(total);
        if (rounding === 'NEAREST_RUPEE') total = Math.round(total);
      } else {
        total = Math.floor(total * factor) / factor;
      }
      return { matched: true, text: `Matches → ${paid(total)} (tier progress assumed ₹0)` };
    }

    if (accrualType === 'PERCENT') {
      const rate = Number(percentRate);
      if (!percentRate.trim() || Number.isNaN(rate)) return null;
      let earned = (amount * rate) / 100;
      if (rounding === 'FLOOR_RUPEE') earned = Math.floor(earned);
      if (rounding === 'NEAREST_RUPEE') earned = Math.round(earned);
      return { matched: true, text: `Matches → ${paid(earned)}` };
    }
    const perSlab = Number(pointsPerSlab);
    if (!slabSize.trim() || !pointsPerSlab.trim() || Number.isNaN(slab) || slab <= 0 || Number.isNaN(perSlab)) {
      return null;
    }
    const earned = Math.floor(Math.floor(amount / slab) * perSlab * factor) / factor;
    return { matched: true, text: `Matches → ${paid(earned)}` };
  }, [previewAmount, previewDescription, previewMcc, previewChannel, previewCategories, previewEmi, previewIntl,
      selectedCategories, mccText, merchantPattern, merchantMatch, channels, minAmount, maxAmount,
      emiTreatment, intlTreatment, rewardType, accrualType, percentRate, rounding, slabSize, pointsPerSlab,
      pointPrecision, isTiered, tierRows]);

  const toggleIn = <T,>(list: T[], item: T): T[] =>
    list.includes(item) ? list.filter((x) => x !== item) : [...list, item];

  const onSubmit = async () => {
    if (!name.trim()) {
      toast.error('Rule name is required.');
      return;
    }
    const mccs = mccText.split(',').map((m) => m.trim()).filter(Boolean);
    const badMcc = mccs.find((m) => !/^\d{4}$/.test(m));
    if (badMcc) {
      toast.error(`MCC must be a 4-digit code: ${badMcc}`);
      return;
    }
    if (!isTiered && accrualType === 'PERCENT' && !percentRate.trim()) {
      toast.error('Percent rate is required (0 models an exclusion).');
      return;
    }
    if (accrualType === 'SLAB' && !slabSize.trim()) {
      toast.error('Slab size is required.');
      return;
    }
    if (!isTiered && accrualType === 'SLAB' && !pointsPerSlab.trim()) {
      toast.error(rewardType === 'POINTS' ? 'Points per slab is required.' : 'Cashback per slab is required.');
      return;
    }
    if (isTiered) {
      if (tierRows.length < 2) {
        toast.error('A tiered rate needs at least two tiers.');
        return;
      }
      if (tierRows.some((t) => !t.rate.trim())) {
        toast.error('Every tier needs a rate.');
        return;
      }
      if (tierRows.slice(0, -1).some((t) => !t.upTo.trim() || Number(t.upTo) <= 0)) {
        toast.error('Every tier except the last needs a positive “up to” breakpoint.');
        return;
      }
    }
    const body: RewardRuleRequest = {
      accountId,
      name: name.trim(),
      // A clone (devaluation successor) inherits its predecessor's slot in the
      // evaluation chain; only brand-new rules go to the top.
      priority: rule?.priority ?? cloneFrom?.priority ?? defaultPriority,
      stacking,
      activeFrom: activeFrom ? toCalendarDate(activeFrom) : null,
      activeTo: activeTo ? toCalendarDate(activeTo) : null,
      categoryIds: selectedCategories.map((c) => c.id),
      mccs,
      channels,
      daysOfWeek,
      merchantPattern: merchantPattern.trim() || null,
      merchantMatch: merchantPattern.trim() && merchantMatch !== 'NONE' ? merchantMatch : null,
      minAmount: numOrNull(minAmount),
      maxAmount: numOrNull(maxAmount),
      emiTreatment,
      intlTreatment,
      feeTreatment,
      rewardType,
      accrualType,
      percentRate: accrualType === 'PERCENT' && !isTiered ? numOrNull(percentRate) : null,
      rounding: accrualType === 'PERCENT' ? rounding : null,
      slabSize: accrualType === 'SLAB' ? numOrNull(slabSize) : null,
      pointsPerSlab: accrualType === 'SLAB' && !isTiered ? numOrNull(pointsPerSlab) : null,
      pointPrecision: accrualType === 'SLAB' ? Number(pointPrecision) || 0 : null,
      tierWindow: isTiered ? tierWindow : null,
      tiers: isTiered
        ? tierRows.map((t, i) => ({
            upTo: i === tierRows.length - 1 ? null : Number(t.upTo),
            rate: Number(t.rate),
          }))
        : null,
      perTxnCap: numOrNull(perTxnCap),
      periodCap: capMode === 'OWN' ? numOrNull(periodCap) : null,
      capWindow: capMode === 'OWN' && periodCap.trim() ? capWindow : null,
      capBucketId: capMode === 'BUCKET' ? capBucketId || null : null,
      onCapExhausted,
    };
    if (capMode === 'BUCKET' && !capBucketId) {
      toast.error('Pick a shared cap bucket, or switch to a different cap mode.');
      return;
    }
    // Reward type may have been switched after the bucket was picked.
    const chosenBucket = capMode === 'BUCKET' ? capBuckets.find((b) => b.id === capBucketId) : undefined;
    if (chosenBucket && chosenBucket.rewardType !== rewardType) {
      toast.error(`“${chosenBucket.name}” is a ${chosenBucket.rewardType === 'POINTS' ? 'points' : 'cash'} bucket — pick one matching this rule’s reward type.`);
      return;
    }
    if (capMode === 'OWN' && !(Number(periodCap) > 0)) {
      toast.error('Enter a positive period cap, or switch cap mode to “No period cap”.');
      return;
    }
    if (merchantPattern.trim() && merchantMatch === 'NONE') {
      toast.error('Pick how the merchant pattern should match.');
      return;
    }
    setIsSubmitting(true);
    try {
      const res = isUpdateMode && rule
        ? await updateRewardRule(rule.id, body)
        : await createRewardRule(body);
      if (res.success) {
        toast.success(isUpdateMode ? 'Rule updated' : 'Rule created');
        onSaved();
      } else {
        toast.error(res.error.message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectTriggerClass =
    'w-full bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 text-xs px-3 h-9 border border-slate-200 dark:border-slate-800 rounded-lg font-semibold shadow-none hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors';
  const inputClass =
    'text-xs h-9 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-lg shadow-none';
  const sectionClass =
    'rounded-xl border border-slate-100 dark:border-slate-800/80 bg-white dark:bg-slate-900/60 p-3 flex flex-col gap-2.5';
  const sectionTitleClass =
    'text-[10px] uppercase tracking-wide font-bold text-slate-400 dark:text-slate-500';
  const chipClass = (active: boolean) =>
    cn(
      'px-2 py-1 rounded-lg text-[11px] font-semibold border transition-colors',
      active
        ? 'bg-emerald-600 text-white border-emerald-600'
        : 'bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-900',
    );

  const dateTrigger = (date: Date | undefined, placeholder: string) => (
    <button type="button" className={cn(selectTriggerClass, 'flex items-center gap-1.5 w-auto')}>
      <CalendarDays className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
      {date ? formatDate(toCalendarDate(date)) : placeholder}
    </button>
  );

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[560px] p-4 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isUpdateMode ? 'Edit Reward Rule' : cloneFrom ? 'Clone Reward Rule' : 'Create Reward Rule'}
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-3">
          {/* Basics */}
          <div className={sectionClass}>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)}
                       placeholder="e.g. 5% online" className={inputClass} />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Stacking</Label>
                <Select value={stacking} onValueChange={(v) => setStacking(v as RuleStacking)}>
                  <SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="EXCLUSIVE" className="text-xs">Exclusive (first match wins)</SelectItem>
                    <SelectItem value="ADDITIVE" className="text-xs">Additive (bonus on top)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Active</Label>
              <DatePicker date={activeFrom} onSelect={setActiveFrom}
                          trigger={dateTrigger(activeFrom, 'Always')} />
              {activeFrom && (
                <button type="button" onClick={() => setActiveFrom(undefined)}
                        className="text-[10px] text-slate-400 hover:text-red-500 font-semibold">
                  Clear
                </button>
              )}
              <span className="text-[10px] text-slate-400">→</span>
              <DatePicker date={activeTo} onSelect={setActiveTo}
                          trigger={dateTrigger(activeTo, 'Open-ended')} />
              {activeTo && (
                <button type="button" onClick={() => setActiveTo(undefined)}
                        className="text-[10px] text-slate-400 hover:text-red-500 font-semibold">
                  Clear
                </button>
              )}
            </div>
          </div>

          {/* Match */}
          <div className={sectionClass}>
            <span className={sectionTitleClass}>Match — leave everything empty to match all spends</span>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Categories <span className="text-slate-400">(OR with MCCs)</span>
              </Label>
              <Combobox options={categories} value={selectedCategories} onChange={setSelectedCategories} />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">MCC codes</Label>
              <Input value={mccText} onChange={(e) => setMccText(e.target.value)}
                     placeholder="Comma-separated, e.g. 5812, 5814" className={inputClass} />
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Merchant pattern</Label>
                <Input value={merchantPattern} onChange={(e) => setMerchantPattern(e.target.value)}
                       placeholder="e.g. swiggy" className={inputClass} />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Match type</Label>
                <Select value={merchantMatch} onValueChange={(v) => setMerchantMatch(v as RewardMerchantMatch | 'NONE')}>
                  <SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE" className="text-xs">—</SelectItem>
                    {(Object.keys(MERCHANT_MATCH_LABELS) as RewardMerchantMatch[]).map((m) => (
                      <SelectItem key={m} value={m} className="text-xs">{MERCHANT_MATCH_LABELS[m]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Channels</Label>
              <div className="flex gap-1.5 flex-wrap">
                {CHANNEL_OPTIONS.map((c) => (
                  <button key={c.value} type="button"
                          onClick={() => setChannels((prev) => toggleIn(prev, c.value))}
                          className={chipClass(channels.includes(c.value))}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Days of week</Label>
              <div className="flex gap-1.5 flex-wrap">
                {DAY_OPTIONS.map((d) => (
                  <button key={d.value} type="button"
                          onClick={() => setDaysOfWeek((prev) => toggleIn(prev, d.value))}
                          className={chipClass(daysOfWeek.includes(d.value))}>
                    {d.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Min amount</Label>
                <Input inputMode="decimal" value={minAmount}
                       onChange={(e) => setMinAmount(sanitizeDecimalInput(e.target.value))}
                       placeholder="₹" className={inputClass} />
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Max amount</Label>
                <Input inputMode="decimal" value={maxAmount}
                       onChange={(e) => setMaxAmount(sanitizeDecimalInput(e.target.value))}
                       placeholder="₹" className={inputClass} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">EMI spends</Label>
                <Select value={emiTreatment} onValueChange={(v) => setEmiTreatment(v as EmiTreatment)}>
                  <SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INCLUDE" className="text-xs">Include</SelectItem>
                    <SelectItem value="EXCLUDE_EMI" className="text-xs">Exclude EMI</SelectItem>
                    <SelectItem value="ONLY_EMI" className="text-xs">Only EMI</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">International</Label>
                <Select value={intlTreatment} onValueChange={(v) => setIntlTreatment(v as IntlTreatment)}>
                  <SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INCLUDE" className="text-xs">Include</SelectItem>
                    <SelectItem value="EXCLUDE_INTL" className="text-xs">Exclude international</SelectItem>
                    <SelectItem value="ONLY_INTL" className="text-xs">Only international</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Convenience fee</Label>
              <Select value={feeTreatment} onValueChange={(v) => setFeeTreatment(v as FeeTreatment)}>
                <SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="INCLUDE" className="text-xs">Earns like the rest of the spend</SelectItem>
                  <SelectItem value="EXCLUDE_FEE" className="text-xs">Netted out of the basis</SelectItem>
                </SelectContent>
              </Select>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">
                Most issuers post the surcharge to the card but award nothing on it.
              </span>
            </div>
          </div>

          {/* Earn */}
          <div className={sectionClass}>
            <span className={sectionTitleClass}>Earn</span>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Rewards paid as <span className="text-slate-400">(card default: {defaultRewardType === 'POINTS' ? 'reward points' : 'cash'})</span>
              </Label>
              <div className="flex gap-1.5">
                <button type="button" onClick={() => setRewardType('CASH')}
                        className={chipClass(rewardType === 'CASH')}>
                  Cash ₹
                </button>
                <button type="button" onClick={() => setRewardType('POINTS')}
                        className={chipClass(rewardType === 'POINTS')}>
                  Reward points
                </button>
              </div>
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">How it accrues</Label>
              <div className="flex gap-1.5">
                <button type="button" onClick={() => setAccrualType('PERCENT')}
                        className={chipClass(accrualType === 'PERCENT')}>
                  % of spend
                </button>
                <button type="button" onClick={() => setAccrualType('SLAB')}
                        className={chipClass(accrualType === 'SLAB')}>
                  Per slab
                </button>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2.5">
              {accrualType === 'PERCENT' ? (
                <>
                  {!isTiered && (
                    <div className="flex flex-col gap-1">
                      <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Rate %</Label>
                      <Input inputMode="decimal" value={percentRate}
                             onChange={(e) => setPercentRate(sanitizeDecimalInput(e.target.value))}
                             placeholder="e.g. 5" className={inputClass} />
                    </div>
                  )}
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Rounding</Label>
                    <Select value={rounding} onValueChange={(v) => setRounding(v as CashbackRounding)}>
                      <SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="NONE" className="text-xs">
                          {rewardType === 'POINTS' ? 'Keep decimals' : 'Keep paise'}
                        </SelectItem>
                        <SelectItem value="FLOOR_RUPEE" className="text-xs">
                          {rewardType === 'POINTS' ? 'Floor to whole point' : 'Floor to rupee'}
                        </SelectItem>
                        <SelectItem value="NEAREST_RUPEE" className="text-xs">
                          {rewardType === 'POINTS' ? 'Nearest whole point' : 'Nearest rupee'}
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              ) : (
                <>
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Slab size ₹</Label>
                    <Input inputMode="decimal" value={slabSize}
                           onChange={(e) => setSlabSize(sanitizeDecimalInput(e.target.value))}
                           placeholder="e.g. 150" className={inputClass} />
                  </div>
                  {!isTiered && (
                    <div className="flex flex-col gap-1">
                      <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                        {rewardType === 'POINTS' ? 'Points per slab' : '₹ per slab'}
                      </Label>
                      <Input inputMode="decimal" value={pointsPerSlab}
                             onChange={(e) => setPointsPerSlab(sanitizeDecimalInput(e.target.value))}
                             placeholder="e.g. 5" className={inputClass} />
                    </div>
                  )}
                  <div className="flex flex-col gap-1">
                    <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                      {rewardType === 'POINTS' ? 'Point precision' : 'Value precision'}
                    </Label>
                    <Select value={pointPrecision} onValueChange={setPointPrecision}>
                      <SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="0" className="text-xs">
                          {rewardType === 'POINTS' ? 'Whole points' : 'Whole rupees'}
                        </SelectItem>
                        <SelectItem value="1" className="text-xs">1 decimal</SelectItem>
                        <SelectItem value="2" className="text-xs">2 decimals</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>

            {/* Tiered (marginal) rate */}
            <div className="flex items-center gap-2 pt-1">
              <button type="button" onClick={() => setIsTiered((p) => !p)} className={chipClass(isTiered)}>
                Tiered rate
              </button>
              <span className="text-[10px] text-slate-400 dark:text-slate-500">
                Rate steps as matched spend grows in a window (e.g. 10X above ₹20k/cycle)
              </span>
            </div>
            {isTiered && (
              <div className="flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium shrink-0">Spend window</Label>
                  <Select value={tierWindow} onValueChange={(v) => setTierWindow(v as CapWindow)}>
                    <SelectTrigger className={cn(selectTriggerClass, 'w-48')}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(CAP_WINDOW_LABELS) as CapWindow[]).map((w) => (
                        <SelectItem key={w} value={w} className="text-xs">{CAP_WINDOW_LABELS[w]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {tierRows.map((tier, index) => {
                  const last = index === tierRows.length - 1;
                  return (
                    <div key={index} className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400 w-10 shrink-0">
                        {index === 0 ? 'First' : last ? 'Above' : 'Then'}
                      </span>
                      {last ? (
                        <span className="text-xs text-slate-500 dark:text-slate-400 font-semibold flex-1">
                          everything beyond
                        </span>
                      ) : (
                        <Input inputMode="decimal" value={tier.upTo}
                               onChange={(e) => {
                                 const value = sanitizeDecimalInput(e.target.value);
                                 setTierRows((rows) => rows.map((r, i) => (i === index ? { ...r, upTo: value } : r)));
                               }}
                               placeholder="up to ₹" className={cn(inputClass, 'flex-1')} />
                      )}
                      <Input inputMode="decimal" value={tier.rate}
                             onChange={(e) => {
                               const value = sanitizeDecimalInput(e.target.value);
                               setTierRows((rows) => rows.map((r, i) => (i === index ? { ...r, rate: value } : r)));
                             }}
                             placeholder={accrualType === 'PERCENT' ? 'rate %' : rewardType === 'POINTS' ? 'pts/slab' : '₹/slab'}
                             className={cn(inputClass, 'w-24 shrink-0')} />
                      {!last && tierRows.length > 2 && (
                        <button type="button" aria-label="Remove tier"
                                onClick={() => setTierRows((rows) => rows.filter((_, i) => i !== index))}
                                className="text-[10px] text-slate-400 hover:text-red-500 font-semibold shrink-0">
                          Remove
                        </button>
                      )}
                    </div>
                  );
                })}
                <button type="button"
                        onClick={() => setTierRows((rows) => [...rows.slice(0, -1), { upTo: '', rate: '' }, rows[rows.length - 1]])}
                        className="self-start text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline">
                  + Add tier
                </button>
              </div>
            )}
            {rewardType === 'POINTS' && (
              <p className="text-[10px] text-slate-400 dark:text-slate-500">
                Points are tracked as points — the report doesn’t convert them to a cash value.
              </p>
            )}
            <p className="text-[10px] text-slate-400 dark:text-slate-500">
              Tip: a 0-rate exclusive rule at high priority models an exclusion (e.g. fuel earns nothing).
            </p>
          </div>

          {/* Limits */}
          <div className={sectionClass}>
            <span className={sectionTitleClass}>Limits</span>
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                Per-transaction cap {rewardType === 'POINTS' ? '(pts)' : '(₹)'}
              </Label>
              <Input inputMode="decimal" value={perTxnCap}
                     onChange={(e) => setPerTxnCap(sanitizeDecimalInput(e.target.value))}
                     placeholder="No cap" className={inputClass} />
            </div>

            <div className="flex flex-col gap-1">
              <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Period cap</Label>
              <Select value={capMode} onValueChange={(v) => setCapMode(v as 'NONE' | 'OWN' | 'BUCKET')}>
                <SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="NONE" className="text-xs">No period cap</SelectItem>
                  <SelectItem value="OWN" className="text-xs">This rule’s own cap</SelectItem>
                  <SelectItem value="BUCKET" className="text-xs" disabled={capBuckets.length === 0}>
                    Shared bucket{capBuckets.length === 0 ? ' (none yet)' : ''}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {capMode === 'OWN' && (
              <div className="grid grid-cols-2 gap-2.5">
                <div className="flex flex-col gap-1">
                  <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">
                    Cap {rewardType === 'POINTS' ? '(pts)' : '(₹)'}
                  </Label>
                  <Input inputMode="decimal" value={periodCap}
                         onChange={(e) => setPeriodCap(sanitizeDecimalInput(e.target.value))}
                         placeholder="e.g. 500" className={inputClass} />
                </div>
                <div className="flex flex-col gap-1">
                  <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Cap window</Label>
                  <Select value={capWindow} onValueChange={(v) => setCapWindow(v as CapWindow)}>
                    <SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {(Object.keys(CAP_WINDOW_LABELS) as CapWindow[]).map((w) => (
                        <SelectItem key={w} value={w} className="text-xs">{CAP_WINDOW_LABELS[w]}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {capMode === 'BUCKET' && (
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Shared bucket</Label>
                <Select value={capBucketId} onValueChange={setCapBucketId}>
                  <SelectTrigger className={selectTriggerClass}><SelectValue placeholder="Pick a bucket" /></SelectTrigger>
                  <SelectContent>
                    {capBuckets.map((b) => (
                      <SelectItem key={b.id} value={b.id} className="text-xs"
                                  disabled={b.rewardType !== rewardType}>
                        {b.name} — {b.cap} {b.rewardType === 'POINTS' ? 'pts' : '₹'} / {CAP_WINDOW_LABELS[b.windowType].toLowerCase()}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <span className="text-[10px] text-slate-400 dark:text-slate-500">
                  Several rules can drain one bucket’s ceiling together (manage buckets on the Rules page).
                  A bucket only takes rules of its own reward type.
                </span>
              </div>
            )}

            {capMode !== 'NONE' && (
              <div className="flex flex-col gap-1">
                <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">When cap exhausted</Label>
                <Select value={onCapExhausted} onValueChange={(v) => setOnCapExhausted(v as CapExhaustedBehavior)}>
                  <SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="FALL_THROUGH" className="text-xs">Fall through to next rule</SelectItem>
                    <SelectItem value="STOP" className="text-xs">Stop (earn nothing)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>

          {/* Test this rule — sample transaction (date/day-of-week not simulated) */}
          <div className="rounded-xl border border-emerald-200/60 dark:border-emerald-900/40 bg-emerald-50/50 dark:bg-emerald-950/20 p-3 flex flex-col gap-2.5 min-w-0">
            <span className="text-[10px] uppercase tracking-wide font-bold text-emerald-700 dark:text-emerald-400">
              Test this rule
            </span>
            <div className="grid grid-cols-2 gap-2.5">
              <div className="flex flex-col gap-1 min-w-0">
                <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Amount ₹</Label>
                <Input inputMode="decimal" value={previewAmount}
                       onChange={(e) => setPreviewAmount(sanitizeDecimalInput(e.target.value))}
                       className={inputClass} />
              </div>
              <div className="flex flex-col gap-1 min-w-0">
                <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Description</Label>
                <Input value={previewDescription}
                       onChange={(e) => setPreviewDescription(e.target.value)}
                       placeholder="e.g. SWIGGY BANGALORE" className={inputClass} />
              </div>
              <div className="flex flex-col gap-1 min-w-0">
                <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">MCC</Label>
                <Input value={previewMcc} inputMode="numeric" maxLength={4}
                       onChange={(e) => setPreviewMcc(e.target.value.replace(/\D/g, ''))}
                       placeholder="e.g. 5812" className={inputClass} />
              </div>
              <div className="flex flex-col gap-1 min-w-0">
                <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Channel</Label>
                <Select value={previewChannel} onValueChange={(v) => setPreviewChannel(v as TransactionChannel | 'NONE')}>
                  <SelectTrigger className={selectTriggerClass}><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NONE" className="text-xs">Not set</SelectItem>
                    {CHANNEL_OPTIONS.map((c) => (
                      <SelectItem key={c.value} value={c.value} className="text-xs">{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex-1 min-w-40">
                <Combobox options={categories} value={previewCategories} onChange={setPreviewCategories} />
              </div>
              <button type="button" onClick={() => setPreviewEmi((p) => !p)} className={chipClass(previewEmi)}>
                EMI
              </button>
              <button type="button" onClick={() => setPreviewIntl((p) => !p)} className={chipClass(previewIntl)}>
                Intl
              </button>
            </div>
            <div className={cn(
              'text-xs font-semibold break-words',
              preview == null ? 'text-slate-400'
                : preview.matched ? 'text-emerald-700 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-500',
            )}>
              {preview?.text ?? 'Enter an amount (and accrual fields) to test.'}
            </div>
            {daysOfWeek.length > 0 && (
              <p className="text-[10px] text-slate-400 dark:text-slate-500">
                Note: this rule has day-of-week conditions, which the tester doesn’t simulate. Caps aren’t simulated either.
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="flex gap-2 flex-row">
          <Button variant="outline" type="button" onClick={onClose}
                  className="flex-1 rounded-xl h-9 text-xs font-semibold">
            Cancel
          </Button>
          <Button type="button" onClick={onSubmit} disabled={isSubmitting}
                  className="flex-1 rounded-xl h-9 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold">
            {isSubmitting ? 'Saving...' : 'Save Rule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

'use client';

import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { createRewardRule, updateRewardRule } from '@/actions/rewards';
import { Category } from '@/lib/categories.types';
import {
  AccrualType,
  CapExhaustedBehavior,
  CapWindow,
  CashbackRounding,
  CounterScope,
  DayOfWeek,
  EmiTreatment,
  FeeTreatment,
  IntlTreatment,
  RewardCapBucket,
  RewardMerchantMatch,
  RewardRule,
  RewardRuleRequest,
  RewardType,
  RuleStacking,
} from '@/lib/rewards.types';
import { TransactionChannel } from '@/lib/transaction.types';
import { formatMoney, parseCalendarDate, toCalendarDate } from '@/lib/utils';

import { numOrNull } from './constants';

interface UseRewardRuleFormProps {
  accountId: string;
  categories: Category[];
  capBuckets: RewardCapBucket[];
  defaultRewardType: RewardType;
  rule?: RewardRule;
  cloneFrom?: RewardRule;
  defaultPriority: number;
  onSaved: () => void;
}

export function useRewardRuleForm({
  accountId,
  categories,
  capBuckets,
  defaultRewardType,
  rule,
  cloneFrom,
  defaultPriority,
  onSaved,
}: UseRewardRuleFormProps) {
  const source = rule ?? cloneFrom;
  const isUpdateMode = !!rule;

  const [name, setName] = useState(source?.name ?? '');
  const [cardId, setCardId] = useState<string | null>(source?.cardholderId ?? null);
  const [counterScope, setCounterScope] = useState<CounterScope>(source?.counterScope ?? 'ACCOUNT');
  const [stacking, setStacking] = useState<RuleStacking>(source?.stacking ?? 'EXCLUSIVE');
  const [activeFrom, setActiveFrom] = useState<Date | undefined>(
    rule?.activeFrom
      ? parseCalendarDate(rule.activeFrom)
      : rule
      ? undefined
      : cloneFrom
      ? cloneFrom.activeTo
        ? parseCalendarDate(cloneFrom.activeTo)
        : new Date()
      : undefined
  );
  const [activeTo, setActiveTo] = useState<Date | undefined>(
    rule?.activeTo ? parseCalendarDate(rule.activeTo) : undefined
  );
  const [selectedCategories, setSelectedCategories] = useState<Category[]>(
    source
      ? source.categories.map((c) => categories.find((x) => x.id === c.id) ?? c)
      : []
  );
  const [mccText, setMccText] = useState(source?.mccs.join(', ') ?? '');
  const [channels, setChannels] = useState<TransactionChannel[]>(source?.channels ?? []);
  const [daysOfWeek, setDaysOfWeek] = useState<DayOfWeek[]>(source?.daysOfWeek ?? []);
  const [merchantPattern, setMerchantPattern] = useState(source?.merchantPattern ?? '');
  const [merchantMatch, setMerchantMatch] = useState<RewardMerchantMatch | 'NONE'>(
    source?.merchantMatch ?? 'NONE'
  );
  const [minAmount, setMinAmount] = useState(
    source?.minAmount != null ? String(source.minAmount) : ''
  );
  const [maxAmount, setMaxAmount] = useState(
    source?.maxAmount != null ? String(source.maxAmount) : ''
  );
  const [emiTreatment, setEmiTreatment] = useState<EmiTreatment>(source?.emiTreatment ?? 'INCLUDE');
  const [intlTreatment, setIntlTreatment] = useState<IntlTreatment>(source?.intlTreatment ?? 'INCLUDE');
  const [feeTreatment, setFeeTreatment] = useState<FeeTreatment>(source?.feeTreatment ?? 'INCLUDE');

  const [rewardType, setRewardType] = useState<RewardType>(
    source?.rewardType ?? defaultRewardType
  );
  const [accrualType, setAccrualType] = useState<AccrualType>(source?.accrualType ?? 'PERCENT');
  const [percentRate, setPercentRate] = useState(
    source?.percentRate != null ? String(source.percentRate) : ''
  );
  const [rounding, setRounding] = useState<CashbackRounding>(source?.rounding ?? 'NONE');
  const [slabSize, setSlabSize] = useState(source?.slabSize != null ? String(source.slabSize) : '');
  const [pointsPerSlab, setPointsPerSlab] = useState(
    source?.pointsPerSlab != null ? String(source.pointsPerSlab) : ''
  );
  const [pointPrecision, setPointPrecision] = useState<string>(
    source?.pointPrecision != null ? String(source.pointPrecision) : '0'
  );

  const [isTiered, setIsTiered] = useState((source?.tiers?.length ?? 0) > 0);
  const [tierWindow, setTierWindow] = useState<CapWindow>(source?.tierWindow ?? 'CALENDAR_MONTH');
  const [tierRows, setTierRows] = useState<{ upTo: string; rate: string }[]>(
    source?.tiers?.length
      ? source.tiers.map((t) => ({
          upTo: t.upTo != null ? String(t.upTo) : '',
          rate: String(t.rate),
        }))
      : [
          { upTo: '20000', rate: '' },
          { upTo: '', rate: '' },
        ]
  );

  const [perTxnCap, setPerTxnCap] = useState(
    source?.perTxnCap != null ? String(source.perTxnCap) : ''
  );
  const [capMode, setCapMode] = useState<'NONE' | 'OWN' | 'BUCKET'>(
    source?.capBucketId ? 'BUCKET' : source?.periodCap != null ? 'OWN' : 'NONE'
  );
  const [periodCap, setPeriodCap] = useState(
    source?.periodCap != null ? String(source.periodCap) : ''
  );
  const [capWindow, setCapWindow] = useState<CapWindow>(source?.capWindow ?? 'CALENDAR_MONTH');
  const [capBucketId, setCapBucketId] = useState<string>(source?.capBucketId ?? '');
  const [onCapExhausted, setOnCapExhausted] = useState<CapExhaustedBehavior>(
    source?.onCapExhausted ?? 'FALL_THROUGH'
  );

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

    const ruleMccs = mccText
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean);
    const hasCategoryPredicate = selectedCategories.length > 0;
    const hasMccPredicate = ruleMccs.length > 0;
    if (hasCategoryPredicate || hasMccPredicate) {
      const categoryHit =
        hasCategoryPredicate &&
        previewCategories.some((pc) =>
          selectedCategories.some((sc) => sc.id === pc.id)
        );
      const mccHit =
        hasMccPredicate &&
        !!previewMcc.trim() &&
        ruleMccs.includes(previewMcc.trim());
      if (!categoryHit && !mccHit) {
        return {
          matched: false,
          text: 'No match — category/MCC not covered by this rule',
        };
      }
    }
    const pattern = merchantPattern.trim().toLowerCase();
    if (pattern && merchantMatch !== 'NONE') {
      const haystack = previewDescription.trim().toLowerCase();
      const hit: boolean | null = !haystack
        ? false
        : merchantMatch === 'CONTAINS'
        ? haystack.includes(pattern)
        : merchantMatch === 'STARTS_WITH'
        ? haystack.startsWith(pattern)
        : merchantMatch === 'EXACT'
        ? haystack === pattern
        : (() => {
            try {
              return new RegExp(merchantPattern.trim(), 'i').test(
                previewDescription
              );
            } catch {
              return null;
            }
          })();
      if (hit === null) {
        return {
          matched: false,
          text: 'Can’t test this regex in the browser (Java-only syntax) — verify via the report',
        };
      }
      if (!hit)
        return {
          matched: false,
          text: 'No match — description doesn’t match the merchant pattern',
        };
    }
    if (
      channels.length > 0 &&
      (previewChannel === 'NONE' || !channels.includes(previewChannel))
    ) {
      return {
        matched: false,
        text: 'No match — channel not covered by this rule',
      };
    }
    if (minAmount.trim() && amount < Number(minAmount)) {
      return {
        matched: false,
        text: `No match — below minimum amount ₹${minAmount}`,
      };
    }
    if (maxAmount.trim() && amount > Number(maxAmount)) {
      return {
        matched: false,
        text: `No match — above maximum amount ₹${maxAmount}`,
      };
    }
    if (emiTreatment === 'EXCLUDE_EMI' && previewEmi)
      return { matched: false, text: 'No match — EMI spends are excluded' };
    if (emiTreatment === 'ONLY_EMI' && !previewEmi)
      return { matched: false, text: 'No match — rule applies to EMI spends only' };
    if (intlTreatment === 'EXCLUDE_INTL' && previewIntl)
      return {
        matched: false,
        text: 'No match — international spends are excluded',
      };
    if (intlTreatment === 'ONLY_INTL' && !previewIntl)
      return {
        matched: false,
        text: 'No match — rule applies to international spends only',
      };

    const slab = Number(slabSize);
    const precision = Number(pointPrecision) || 0;
    const factor = Math.pow(10, precision);
    const paid = (n: number) => {
      const display = Math.round(n * 100) / 100;
      return rewardType === 'POINTS'
        ? `${display} pts`
        : `${formatMoney(display)} cashback`;
    };

    if (isTiered) {
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
      return {
        matched: true,
        text: `Matches → ${paid(total)} (tier progress assumed ₹0)`,
      };
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
    if (
      !slabSize.trim() ||
      !pointsPerSlab.trim() ||
      Number.isNaN(slab) ||
      slab <= 0 ||
      Number.isNaN(perSlab)
    ) {
      return null;
    }
    const earned =
      Math.floor(Math.floor(amount / slab) * perSlab * factor) / factor;
    return { matched: true, text: `Matches → ${paid(earned)}` };
  }, [
    previewAmount,
    previewDescription,
    previewMcc,
    previewChannel,
    previewCategories,
    previewEmi,
    previewIntl,
    selectedCategories,
    mccText,
    merchantPattern,
    merchantMatch,
    channels,
    minAmount,
    maxAmount,
    emiTreatment,
    intlTreatment,
    rewardType,
    accrualType,
    percentRate,
    rounding,
    slabSize,
    pointsPerSlab,
    pointPrecision,
    isTiered,
    tierRows,
  ]);

  const onSubmit = async () => {
    if (!name.trim()) {
      toast.error('Rule name is required.');
      return;
    }
    const mccs = mccText
      .split(',')
      .map((m) => m.trim())
      .filter(Boolean);
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
      toast.error(
        rewardType === 'POINTS'
          ? 'Points per slab is required.'
          : 'Cashback per slab is required.'
      );
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
      if (
        tierRows
          .slice(0, -1)
          .some((t) => !t.upTo.trim() || Number(t.upTo) <= 0)
      ) {
        toast.error(
          'Every tier except the last needs a positive “up to” breakpoint.'
        );
        return;
      }
    }
    const body: RewardRuleRequest = {
      accountId,
      cardholderId: cardId || null,
      counterScope,
      name: name.trim(),
      priority: rule?.priority ?? cloneFrom?.priority ?? defaultPriority,
      stacking,
      activeFrom: activeFrom ? toCalendarDate(activeFrom) : null,
      activeTo: activeTo ? toCalendarDate(activeTo) : null,
      categoryIds: selectedCategories.map((c) => c.id),
      mccs,
      channels,
      daysOfWeek,
      merchantPattern: merchantPattern.trim() || null,
      merchantMatch:
        merchantPattern.trim() && merchantMatch !== 'NONE'
          ? merchantMatch
          : null,
      minAmount: numOrNull(minAmount),
      maxAmount: numOrNull(maxAmount),
      emiTreatment,
      intlTreatment,
      feeTreatment,
      rewardType,
      accrualType,
      percentRate:
        accrualType === 'PERCENT' && !isTiered ? numOrNull(percentRate) : null,
      rounding: accrualType === 'PERCENT' ? rounding : null,
      slabSize: accrualType === 'SLAB' ? numOrNull(slabSize) : null,
      pointsPerSlab:
        accrualType === 'SLAB' && !isTiered ? numOrNull(pointsPerSlab) : null,
      pointPrecision:
        accrualType === 'SLAB' ? Number(pointPrecision) || 0 : null,
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
    const chosenBucket =
      capMode === 'BUCKET'
        ? capBuckets.find((b) => b.id === capBucketId)
        : undefined;
    if (chosenBucket && chosenBucket.rewardType !== rewardType) {
      toast.error(
        `“${chosenBucket.name}” is a ${
          chosenBucket.rewardType === 'POINTS' ? 'points' : 'cash'
        } bucket — pick one matching this rule’s reward type.`
      );
      return;
    }
    if (capMode === 'OWN' && !(Number(periodCap) > 0)) {
      toast.error(
        'Enter a positive period cap, or switch cap mode to “No period cap”.'
      );
      return;
    }
    if (merchantPattern.trim() && merchantMatch === 'NONE') {
      toast.error('Pick how the merchant pattern should match.');
      return;
    }
    setIsSubmitting(true);
    try {
      const res =
        isUpdateMode && rule
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

  return {
    isUpdateMode,
    name,
    setName,
    cardId,
    setCardId,
    counterScope,
    setCounterScope,
    stacking,
    setStacking,
    activeFrom,
    setActiveFrom,
    activeTo,
    setActiveTo,
    selectedCategories,
    setSelectedCategories,
    mccText,
    setMccText,
    channels,
    setChannels,
    daysOfWeek,
    setDaysOfWeek,
    merchantPattern,
    setMerchantPattern,
    merchantMatch,
    setMerchantMatch,
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
    rewardType,
    setRewardType,
    accrualType,
    setAccrualType,
    percentRate,
    setPercentRate,
    rounding,
    setRounding,
    slabSize,
    setSlabSize,
    pointsPerSlab,
    setPointsPerSlab,
    pointPrecision,
    setPointPrecision,
    isTiered,
    setIsTiered,
    tierWindow,
    setTierWindow,
    tierRows,
    setTierRows,
    perTxnCap,
    setPerTxnCap,
    capMode,
    setCapMode,
    periodCap,
    setPeriodCap,
    capWindow,
    setCapWindow,
    capBucketId,
    setCapBucketId,
    onCapExhausted,
    setOnCapExhausted,
    previewAmount,
    setPreviewAmount,
    previewDescription,
    setPreviewDescription,
    previewMcc,
    setPreviewMcc,
    previewChannel,
    setPreviewChannel,
    previewCategories,
    setPreviewCategories,
    previewEmi,
    setPreviewEmi,
    previewIntl,
    setPreviewIntl,
    preview,
    isSubmitting,
    onSubmit,
  };
}

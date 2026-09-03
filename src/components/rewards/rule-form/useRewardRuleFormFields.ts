'use client';

import { useState } from 'react';

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
  RewardMerchantMatch,
  RewardRule,
  RewardType,
  RuleStacking,
} from '@/lib/rewards.types';
import { TransactionChannel } from '@/lib/transaction.types';
import { parseCalendarDate } from '@/lib/utils';

interface UseRewardRuleFormFieldsProps {
  categories: Category[];
  defaultRewardType: RewardType;
  rule?: RewardRule;
  cloneFrom?: RewardRule;
}

/** All the editable form state for the rule dialog — basics, match, earn, limits and the tester inputs. */
export function useRewardRuleFormFields({
  categories,
  defaultRewardType,
  rule,
  cloneFrom,
}: UseRewardRuleFormFieldsProps) {
  const source = rule ?? cloneFrom;

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
    source?.categories
      ? source.categories.map((c) => categories.find((x) => x.id === c.id) ?? c)
      : []
  );
  const [mccText, setMccText] = useState(source?.mccs?.join(', ') ?? '');
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

  return {
    name, setName,
    cardId, setCardId,
    counterScope, setCounterScope,
    stacking, setStacking,
    activeFrom, setActiveFrom,
    activeTo, setActiveTo,
    selectedCategories, setSelectedCategories,
    mccText, setMccText,
    channels, setChannels,
    daysOfWeek, setDaysOfWeek,
    merchantPattern, setMerchantPattern,
    merchantMatch, setMerchantMatch,
    minAmount, setMinAmount,
    maxAmount, setMaxAmount,
    emiTreatment, setEmiTreatment,
    intlTreatment, setIntlTreatment,
    feeTreatment, setFeeTreatment,
    rewardType, setRewardType,
    accrualType, setAccrualType,
    percentRate, setPercentRate,
    rounding, setRounding,
    slabSize, setSlabSize,
    pointsPerSlab, setPointsPerSlab,
    pointPrecision, setPointPrecision,
    isTiered, setIsTiered,
    tierWindow, setTierWindow,
    tierRows, setTierRows,
    perTxnCap, setPerTxnCap,
    capMode, setCapMode,
    periodCap, setPeriodCap,
    capWindow, setCapWindow,
    capBucketId, setCapBucketId,
    onCapExhausted, setOnCapExhausted,
    previewAmount, setPreviewAmount,
    previewDescription, setPreviewDescription,
    previewMcc, setPreviewMcc,
    previewChannel, setPreviewChannel,
    previewCategories, setPreviewCategories,
    previewEmi, setPreviewEmi,
    previewIntl, setPreviewIntl,
  };
}

export type RewardRuleFormFields = ReturnType<typeof useRewardRuleFormFields>;

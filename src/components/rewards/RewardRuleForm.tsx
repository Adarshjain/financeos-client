'use client';

import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import type { AccountCard } from '@/lib/account.types';
import type { Category } from '@/lib/categories.types';
import type {
  RewardCapBucket,
  RewardRule,
  RewardType,
} from '@/lib/rewards.types';

import { RuleBasicsSection } from './rule-form/RuleBasicsSection';
import { RuleEarnSection } from './rule-form/RuleEarnSection';
import { RuleLimitsSection } from './rule-form/RuleLimitsSection';
import { RuleMatchSection } from './rule-form/RuleMatchSection';
import { RuleTesterSection } from './rule-form/RuleTesterSection';
import { useRewardRuleForm } from './rule-form/useRewardRuleForm';

interface RewardRuleFormProps {
  accountId: string;
  cards?: AccountCard[];
  categories: Category[];
  capBuckets: RewardCapBucket[];
  /** The card's default reward currency — preselected for new rules. */
  defaultRewardType: RewardType;
  /** Editing this rule; undefined = create. */
  rule?: RewardRule;
  /** Prefill from this rule but create new (end-date & clone flow). */
  cloneFrom?: RewardRule;
  defaultPriority: number;
  isBank?: boolean;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
}

export default function RewardRuleForm({
  accountId,
  cards,
  categories,
  capBuckets,
  defaultRewardType,
  rule,
  cloneFrom,
  defaultPriority,
  isBank,
  open,
  onClose,
  onSaved,
}: RewardRuleFormProps) {
  const {
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
  } = useRewardRuleForm({
    accountId,
    categories,
    capBuckets,
    defaultRewardType,
    rule,
    cloneFrom,
    defaultPriority,
    onSaved,
  });

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>
            {isUpdateMode
              ? 'Edit Reward Rule'
              : cloneFrom
              ? 'Clone Reward Rule'
              : 'Create Reward Rule'}
          </DialogTitle>
        </DialogHeader>

        <DialogBody className="flex flex-col gap-3">
          {/* Basics */}
          <RuleBasicsSection
            name={name}
            setName={setName}
            stacking={stacking}
            setStacking={setStacking}
            cards={cards}
            cardId={cardId}
            setCardId={setCardId}
            counterScope={counterScope}
            setCounterScope={setCounterScope}
            activeFrom={activeFrom}
            setActiveFrom={setActiveFrom}
            activeTo={activeTo}
            setActiveTo={setActiveTo}
            isBank={isBank}
          />

          {/* Match */}
          <RuleMatchSection
            categories={categories}
            selectedCategories={selectedCategories}
            setSelectedCategories={setSelectedCategories}
            mccText={mccText}
            setMccText={setMccText}
            merchantPattern={merchantPattern}
            setMerchantPattern={setMerchantPattern}
            merchantMatch={merchantMatch}
            setMerchantMatch={setMerchantMatch}
            channels={channels}
            setChannels={setChannels}
            daysOfWeek={daysOfWeek}
            setDaysOfWeek={setDaysOfWeek}
            minAmount={minAmount}
            setMinAmount={setMinAmount}
            maxAmount={maxAmount}
            setMaxAmount={setMaxAmount}
            emiTreatment={emiTreatment}
            setEmiTreatment={setEmiTreatment}
            intlTreatment={intlTreatment}
            setIntlTreatment={setIntlTreatment}
            feeTreatment={feeTreatment}
            setFeeTreatment={setFeeTreatment}
          />

          {/* Earn */}
          <RuleEarnSection
            defaultRewardType={defaultRewardType}
            rewardType={rewardType}
            setRewardType={setRewardType}
            accrualType={accrualType}
            setAccrualType={setAccrualType}
            isTiered={isTiered}
            setIsTiered={setIsTiered}
            percentRate={percentRate}
            setPercentRate={setPercentRate}
            rounding={rounding}
            setRounding={setRounding}
            slabSize={slabSize}
            setSlabSize={setSlabSize}
            pointsPerSlab={pointsPerSlab}
            setPointsPerSlab={setPointsPerSlab}
            pointPrecision={pointPrecision}
            setPointPrecision={setPointPrecision}
            tierWindow={tierWindow}
            setTierWindow={setTierWindow}
            tierRows={tierRows}
            setTierRows={setTierRows}
          />

          {/* Limits */}
          <RuleLimitsSection
            rewardType={rewardType}
            perTxnCap={perTxnCap}
            setPerTxnCap={setPerTxnCap}
            capMode={capMode}
            setCapMode={setCapMode}
            capBuckets={capBuckets}
            periodCap={periodCap}
            setPeriodCap={setPeriodCap}
            capWindow={capWindow}
            setCapWindow={setCapWindow}
            capBucketId={capBucketId}
            setCapBucketId={setCapBucketId}
            onCapExhausted={onCapExhausted}
            setOnCapExhausted={setOnCapExhausted}
          />

          {/* Test this rule */}
          <RuleTesterSection
            categories={categories}
            previewAmount={previewAmount}
            setPreviewAmount={setPreviewAmount}
            previewDescription={previewDescription}
            setPreviewDescription={setPreviewDescription}
            previewMcc={previewMcc}
            setPreviewMcc={setPreviewMcc}
            previewChannel={previewChannel}
            setPreviewChannel={setPreviewChannel}
            previewCategories={previewCategories}
            setPreviewCategories={setPreviewCategories}
            previewEmi={previewEmi}
            setPreviewEmi={setPreviewEmi}
            previewIntl={previewIntl}
            setPreviewIntl={setPreviewIntl}
            preview={preview}
            daysOfWeek={daysOfWeek}
          />
        </DialogBody>

        <DialogFooter
          primaryAction={{
            label: isSubmitting ? 'Saving...' : 'Save Rule',
            onClick: onSubmit,
            disabled: isSubmitting,
          }}
          secondaryAction={{
            label: 'Cancel',
            onClick: onClose,
          }}
        />
      </DialogContent>
    </Dialog>
  );
}

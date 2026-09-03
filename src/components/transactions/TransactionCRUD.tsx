'use client';

import * as React from 'react';

import DayPicker from '@/components/DayPicker';
import { DialogBody, DialogFooter } from '@/components/ui/dialog';
import { Transaction } from '@/lib/transaction.types';

import { AccountCategorySection } from './crud/AccountCategorySection';
import { AmountHeroSection } from './crud/AmountHeroSection';
import { DescriptionSection } from './crud/DescriptionSection';
import { RewardsDetailsSection } from './crud/RewardsDetailsSection';
import { StatusFlagsSection } from './crud/StatusFlagsSection';
import { useTransactionCRUD } from './crud/useTransactionCRUD';

interface TransactionCRUDProps {
  transaction?: Transaction;
  onSuccess?: () => void;
  onClose?: () => void;
}

export default function TransactionCRUD({
  transaction,
  onSuccess,
  onClose,
}: TransactionCRUDProps) {
  const {
    formRef,
    isUpdateMode,
    isSubmitting,
    amount,
    setAmount,
    date,
    setDate,
    suggestingCategories,
    handleDescriptionBlur,
    accountId,
    cardId,
    setCardId,
    selectableAccounts,
    handleAccountChange,
    isCreditCard,
    cardOptions,
    localCategories,
    selectedCategories,
    setSelectedCategories,
    createCategory,
    creatingCategory,
    mcc,
    setMcc,
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
    reviewType,
    setReviewType,
    isExcluded,
    setIsExcluded,
    isMonitored,
    setIsMonitored,
    monitoringReason,
    setMonitoringReason,
    onSubmit,
  } = useTransactionCRUD({
    transaction,
    onSuccess,
  });

  return (
    <>
      <DialogBody className="bg-slate-50/40 dark:bg-slate-950/20 scrollbar-thin">
        <form
          ref={formRef}
          id="transaction-form"
          onSubmit={onSubmit}
          className="space-y-2"
        >
          {/* Hero Section: Amount Input & Sign Toggle */}
          <AmountHeroSection amount={amount} setAmount={setAmount} />

          {/* Date Selector Row */}
          <div className="bg-white dark:bg-slate-900/60 rounded-xl p-2.5 border border-slate-100 dark:border-slate-800/80 shadow-sm">
            <DayPicker date={date} onSelect={setDate} />
          </div>

          {/* Description & Source Details */}
          <DescriptionSection
            description={transaction?.description ?? undefined}
            sourcedDescription={transaction?.sourcedDescription ?? undefined}
            suggestingCategories={suggestingCategories}
            onDescriptionBlur={handleDescriptionBlur}
          />

          {/* Group 1: Transaction Details Card */}
          <AccountCategorySection
            accountId={accountId}
            cardId={cardId}
            setCardId={setCardId}
            selectableAccounts={selectableAccounts}
            isUpdateMode={isUpdateMode}
            hasAccountId={!!transaction?.accountId}
            handleAccountChange={handleAccountChange}
            isCreditCard={isCreditCard}
            cardOptions={cardOptions}
            localCategories={localCategories}
            selectedCategories={selectedCategories}
            setSelectedCategories={setSelectedCategories}
            createCategory={createCategory}
            creatingCategory={creatingCategory}
            mcc={mcc}
            setMcc={setMcc}
          />

          {/* Rewards Details Card (collapsible) */}
          <RewardsDetailsSection
            showRewardDetails={showRewardDetails}
            setShowRewardDetails={setShowRewardDetails}
            hasRewardDetails={hasRewardDetails}
            settlementDate={settlementDate}
            setSettlementDate={setSettlementDate}
            instantDiscount={instantDiscount}
            setInstantDiscount={setInstantDiscount}
            convenienceFee={convenienceFee}
            setConvenienceFee={setConvenienceFee}
            channel={channel}
            setChannel={setChannel}
            isEmi={isEmi}
            setIsEmi={setIsEmi}
            isInternational={isInternational}
            setIsInternational={setIsInternational}
          />

          {/* Group 2: Status & Flags Card */}
          <StatusFlagsSection
            isUpdateMode={isUpdateMode}
            reviewType={reviewType}
            setReviewType={setReviewType}
            isExcluded={isExcluded}
            setIsExcluded={setIsExcluded}
            isMonitored={isMonitored}
            setIsMonitored={setIsMonitored}
            monitoringReason={monitoringReason}
            setMonitoringReason={setMonitoringReason}
          />
        </form>
      </DialogBody>

      <DialogFooter
        primaryAction={{
          label: isSubmitting ? 'Saving...' : 'Save',
          type: 'submit',
          form: 'transaction-form',
          disabled: isSubmitting,
        }}
        secondaryAction={{
          label: isUpdateMode ? 'Back' : 'Close',
          onClick: () => onClose?.(),
        }}
      />
    </>
  );
}
'use client';

import { useMemo } from 'react';

import { useAccounts } from '@/lib/query/hooks/useAccounts';
import { useCategories } from '@/lib/query/hooks/useCategories';
import { rewardEligibleAccounts } from '@/lib/rewards.types';

import { SimulatorForm } from './simulator/SimulatorForm';
import { SimulatorResults } from './simulator/SimulatorResults';
import { useRecommendSimulator } from './simulator/useRecommendSimulator';

export default function RecommendSimulator() {
  const { data: rawAccounts = [] } = useAccounts();
  const { data: categories = [] } = useCategories();
  const accounts = useMemo(() => rewardEligibleAccounts(rawAccounts), [rawAccounts]);
  const {
    amount,
    setAmount,
    date,
    setDate,
    selectedCategoryIds,
    setSelectedCategoryIds,
    categorySearchQuery,
    setCategorySearchQuery,
    mcc,
    setMcc,
    merchantText,
    setMerchantText,
    channel,
    setChannel,
    isEmi,
    setIsEmi,
    isIntl,
    setIsIntl,
    selectedAccountIds,
    setSelectedAccountIds,
    loading,
    result,
    expandedCards,
    handleSimulate,
    toggleExpand,
  } = useRecommendSimulator();

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Form Column */}
        <SimulatorForm
          categories={categories}
          accounts={accounts}
          amount={amount}
          setAmount={setAmount}
          merchantText={merchantText}
          setMerchantText={setMerchantText}
          channel={channel}
          setChannel={setChannel}
          date={date}
          setDate={setDate}
          selectedCategoryIds={selectedCategoryIds}
          setSelectedCategoryIds={setSelectedCategoryIds}
          categorySearchQuery={categorySearchQuery}
          setCategorySearchQuery={setCategorySearchQuery}
          mcc={mcc}
          setMcc={setMcc}
          isEmi={isEmi}
          setIsEmi={setIsEmi}
          isIntl={isIntl}
          setIsIntl={setIsIntl}
          selectedAccountIds={selectedAccountIds}
          setSelectedAccountIds={setSelectedAccountIds}
          loading={loading}
          onSimulate={handleSimulate}
        />

        {/* Results Column */}
        <SimulatorResults
          loading={loading}
          result={result}
          expandedCards={expandedCards}
          onToggleExpand={toggleExpand}
        />
      </div>
    </div>
  );
}

'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { recommendCards } from '@/actions/rewards';
import { RewardRecommendationResponse } from '@/lib/rewards.types';
import { TransactionChannel } from '@/lib/transaction.types';
import { toCalendarDate } from '@/lib/utils';

export function useRecommendSimulator() {
  const [amount, setAmount] = useState<string>('5000');
  const [date, setDate] = useState<Date>(new Date());
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [categorySearchQuery, setCategorySearchQuery] = useState<string>('');
  const [mcc, setMcc] = useState<string>('');
  const [merchantText, setMerchantText] = useState<string>('');
  const [channel, setChannel] = useState<string>('ALL');
  const [isEmi, setIsEmi] = useState<boolean>(false);
  const [isIntl, setIsIntl] = useState<boolean>(false);
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);

  const [loading, setLoading] = useState<boolean>(false);
  const [result, setResult] = useState<RewardRecommendationResponse | null>(null);
  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  const handleSimulate = async () => {
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      toast.error('Please enter a valid spend amount greater than ₹0');
      return;
    }

    setLoading(true);
    try {
      const res = await recommendCards({
        amount: numericAmount,
        date: toCalendarDate(date),
        categoryIds:
          selectedCategoryIds.length > 0 ? selectedCategoryIds : undefined,
        mcc: mcc.trim() ? mcc.trim() : undefined,
        merchantText: merchantText.trim() ? merchantText.trim() : undefined,
        channel: channel !== 'ALL' ? (channel as TransactionChannel) : undefined,
        isEmi,
        isIntl,
        accountIds:
          selectedAccountIds.length > 0 ? selectedAccountIds : undefined,
      });

      if (res.success) {
        setResult(res.data);
        if (res.data.recommendations.length > 0) {
          setExpandedCards({ [res.data.recommendations[0].accountId]: true });
        }
      } else {
        toast.error(res.error.message || 'Failed to simulate card rewards');
      }
    } catch {
      toast.error('An unexpected error occurred during simulation');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (accountId: string) => {
    setExpandedCards((prev) => ({ ...prev, [accountId]: !prev[accountId] }));
  };

  return {
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
  };
}

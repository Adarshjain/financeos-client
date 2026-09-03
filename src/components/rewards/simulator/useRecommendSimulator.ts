'use client';

import { useState } from 'react';
import { toast } from 'sonner';

import { useRecommendCards } from '@/components/rewards/queries/useRewardRecommendMutation';
import { ApiError } from '@/lib/api/client';
import { TransactionChannel } from '@/lib/transaction.types';
import { toCalendarDate } from '@/lib/utils';

const TRANSACTION_CHANNELS: readonly TransactionChannel[] = [
  'ONLINE', 'POS', 'UPI', 'CONTACTLESS', 'ATM', 'OTHER',
];
function isTransactionChannel(v: string): v is TransactionChannel {
  return (TRANSACTION_CHANNELS as readonly string[]).includes(v);
}

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

  const [expandedCards, setExpandedCards] = useState<Record<string, boolean>>({});

  const recommend = useRecommendCards();

  const handleSimulate = () => {
    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      toast.error('Please enter a valid spend amount greater than ₹0');
      return;
    }

    recommend.mutate(
      {
        amount: numericAmount,
        date: toCalendarDate(date),
        categoryIds:
          selectedCategoryIds.length > 0 ? selectedCategoryIds : undefined,
        mcc: mcc.trim() ? mcc.trim() : undefined,
        merchantText: merchantText.trim() ? merchantText.trim() : undefined,
        channel: isTransactionChannel(channel) ? channel : undefined,
        isEmi,
        isIntl,
        accountIds:
          selectedAccountIds.length > 0 ? selectedAccountIds : undefined,
      },
      {
        onSuccess: (data) => {
          if (data.recommendations.length > 0) {
            setExpandedCards({ [data.recommendations[0].accountId]: true });
          }
        },
        onError: (e) =>
          toast.error(
            e instanceof ApiError ? e.response.message : 'Failed to simulate card rewards'
          ),
      }
    );
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
    loading: recommend.isPending,
    result: recommend.data ?? null,
    expandedCards,
    handleSimulate,
    toggleExpand,
  };
}

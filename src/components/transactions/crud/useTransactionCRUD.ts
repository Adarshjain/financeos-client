'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

import { isValidMcc } from '@/components/forms/MccInput';
import { api, ApiError } from '@/lib/api/client';
import type { Schemas } from '@/lib/api/types';
import { useAccounts } from '@/lib/query/hooks/useAccounts';
import { useCategories } from '@/lib/query/hooks/useCategories';
import { keys } from '@/lib/query/keys';
import {
  ReviewType,
  Transaction,
  TransactionChannel,
  TransactionRequest,
} from '@/lib/transaction.types';
import { AccountType } from '@/lib/types';
import { parseCalendarDate } from '@/lib/utils';

import {
  buildTransactionRequest,
  computeHasRewardDetails,
  getCardOptions,
  getDefaultCardIdForAccount,
  getSelectableAccounts,
  parseNonNegativeAmount,
} from './transactionCRUD.helpers';
import { useCategorySuggestions } from './useCategorySuggestions';

interface UseTransactionCRUDProps {
  transaction?: Transaction;
  onSuccess?: () => void;
}

export function useTransactionCRUD({
  transaction,
  onSuccess,
}: UseTransactionCRUDProps) {
  const queryClient = useQueryClient();
  const { data: accounts = [] } = useAccounts();
  const { data: categories = [] } = useCategories();
  const isUpdateMode = !!transaction;

  const [amount, setAmount] = useState<string>(
    transaction ? '' + transaction?.amount.toFixed(2) : '-0'
  );
  const [date, setDate] = useState<Date>(
    transaction ? parseCalendarDate(transaction.date) : new Date()
  );
  const [mcc, setMcc] = useState<string>(transaction?.mcc ?? '');
  const {
    localCategories,
    selectedCategories,
    setSelectedCategories,
    creatingCategory,
    suggestingCategories,
    createCategory,
    handleDescriptionBlur,
  } = useCategorySuggestions({
    categories,
    initialSelectedCategories: transaction?.categories ?? [],
    isUpdateMode,
    onMccSuggested: (suggested) => setMcc((prev) => (!prev ? suggested : prev)),
  });

  const [accountId, setAccountId] = useState<string>(
    transaction?.accountId ?? ''
  );
  const [cardId, setCardId] = useState<string | null>(
    transaction?.cardId ?? null
  );

  const selectableAccounts = getSelectableAccounts(accounts, transaction);
  const selectedAccount = accounts.find((a) => a.id === accountId);
  const supportsCards =
    selectedAccount?.type === AccountType.CREDIT_CARD ||
    selectedAccount?.type === AccountType.BANK_ACCOUNT;
  const isBank = selectedAccount?.type === AccountType.BANK_ACCOUNT;

  const cardOptions = getCardOptions(selectedAccount, isBank, transaction);

  const handleAccountChange = (newAccountId: string) => {
    setAccountId(newAccountId);
    const acc = accounts.find((a) => a.id === newAccountId);
    setCardId(getDefaultCardIdForAccount(acc));
  };

  const [isMonitored, setIsMonitored] = useState(
    transaction?.isTransactionUnderMonitoring ?? false
  );
  const [monitoringReason, setMonitoringReason] = useState<string>(
    transaction?.monitoringReason ?? ''
  );
  const [isExcluded, setIsExcluded] = useState(
    transaction?.isTransactionExcluded ?? false
  );
  const [reviewType, setReviewType] = useState<ReviewType>(
    transaction?.reviewType ?? 'MANUALLY_REVIEWED'
  );

  const hasRewardDetails = computeHasRewardDetails(transaction);
  const [showRewardDetails, setShowRewardDetails] = useState(hasRewardDetails);
  const [settlementDate, setSettlementDate] = useState<Date | undefined>(
    transaction?.settlementDate
      ? parseCalendarDate(transaction.settlementDate)
      : undefined
  );
  const [instantDiscount, setInstantDiscount] = useState<string>(
    transaction?.instantDiscount != null
      ? String(transaction.instantDiscount)
      : ''
  );
  const [convenienceFee, setConvenienceFee] = useState<string>(
    transaction?.convenienceFee != null
      ? String(transaction.convenienceFee)
      : ''
  );
  const [channel, setChannel] = useState<TransactionChannel | 'NONE'>(
    transaction?.channel ?? 'NONE'
  );
  const [isEmi, setIsEmi] = useState(transaction?.isEmi ?? false);
  const [isInternational, setIsInternational] = useState(
    transaction?.isInternational ?? false
  );

  const [isSubmitting, setIsSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement | null>(null);

  const createMutation = useMutation({
    mutationFn: async (body: TransactionRequest) => {
      const { data } = await api.POST('/api/v1/transactions', {
        body: body as Schemas['CreateTransactionRequest'],
      });
      return data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.transactions.all });
      queryClient.invalidateQueries({ queryKey: keys.accounts.all });
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: TransactionRequest }) => {
      const { data } = await api.PUT('/api/v1/transactions/{id}', {
        params: { path: { id } },
        body: body as Schemas['UpdateTransactionRequest'],
      });
      return data!;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: keys.transactions.all });
      queryClient.invalidateQueries({ queryKey: keys.accounts.all });
    },
  });

  const onSubmit = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const form = formRef.current;
    if (!form) {
      toast.error('Form not available');
      return;
    }
    if (!accountId) {
      toast.error('Please select an account');
      return;
    }
    const rawMcc = mcc.trim();
    if (!isValidMcc(rawMcc)) {
      toast.error('MCC code must be exactly 4 digits (or left empty).');
      return;
    }
    const discount = parseNonNegativeAmount(instantDiscount, 'Instant discount');
    if (discount.error) {
      toast.error(discount.error);
      return;
    }
    const fee = parseNonNegativeAmount(convenienceFee, 'Convenience fee');
    if (fee.error) {
      toast.error(fee.error);
      return;
    }
    setIsSubmitting(true);
    try {
      const transactionRequest = buildTransactionRequest({
        accountId,
        cardId,
        supportsCards,
        description: form.description.value,
        amount,
        categoryIds: selectedCategories.map((c) => c.id),
        date,
        isExcluded,
        isMonitored,
        monitoringReason,
        mcc: rawMcc,
        isUpdateMode,
        source: transaction?.source,
        settlementDate,
        instantDiscount: discount.value,
        convenienceFee: fee.value,
        channel,
        isEmi,
        isInternational,
        reviewType,
      });
      if (isUpdateMode && transaction) {
        await updateMutation.mutateAsync({ id: transaction.id, body: transactionRequest });
      } else {
        await createMutation.mutateAsync(transactionRequest);
      }
      toast.success('Transaction saved!');
      onSuccess?.();
    } catch (err) {
      if (err instanceof ApiError) {
        toast.error(err.response.message);
      } else {
        toast.error('Error:\n' + (err as Error).message);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
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
    supportsCards,
    isCreditCard: supportsCards,
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
  };
}

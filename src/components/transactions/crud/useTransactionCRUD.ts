'use client';

import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import {
  categorizeDescription,
  createCategory as createCategoryAction,
} from '@/actions/categories';
import { createTransaction, updateTransaction } from '@/actions/transactions';
import { isValidMcc } from '@/components/forms/MccInput';
import {
  Account,
  isAccountClosed,
  isCardholderClosed,
} from '@/lib/account.types';
import { Category } from '@/lib/categories.types';
import {
  ReviewType,
  Transaction,
  TransactionChannel,
  TransactionRequest,
} from '@/lib/transaction.types';
import { AccountType } from '@/lib/types';
import { parseCalendarDate, toCalendarDate } from '@/lib/utils';

interface UseTransactionCRUDProps {
  transaction?: Transaction;
  accounts: Account[];
  categories: Category[];
  onSuccess?: () => void;
}

export function useTransactionCRUD({
  transaction,
  accounts,
  categories,
  onSuccess,
}: UseTransactionCRUDProps) {
  const [selectedCategories, setSelectedCategories] = useState<Category[]>(
    transaction?.categories ?? []
  );
  const [localCategories, setLocalCategories] = useState<Category[]>(
    categories ?? []
  );
  const [amount, setAmount] = useState<string>(
    transaction ? '' + transaction?.amount.toFixed(2) : '-0'
  );
  const [date, setDate] = useState<Date>(
    transaction ? parseCalendarDate(transaction.date) : new Date()
  );
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [suggestingCategories, setSuggestingCategories] = useState(false);
  const suggestedDescriptionRef = useRef<string | null>(null);

  const [accountId, setAccountId] = useState<string>(
    transaction?.accountId ?? ''
  );
  const [cardId, setCardId] = useState<string | null>(
    transaction?.cardId ?? null
  );

  const selectableAccounts = accounts.filter(
    (a) =>
      (a.type !== AccountType.BROKER && !isAccountClosed(a)) ||
      a.id === transaction?.accountId
  );
  const selectedAccount = accounts.find((a) => a.id === accountId);
  const isCreditCard = selectedAccount?.type === AccountType.CREDIT_CARD;

  const cardOptions = isCreditCard
    ? (selectedAccount.cardholders ?? []).flatMap((ch) =>
        (ch.cards ?? [])
          .filter(
            (c) =>
              (!c.closedOn && !isCardholderClosed(ch)) ||
              c.id === transaction?.cardId
          )
          .map((c) => ({
            id: c.id,
            label: `${ch.personName || (ch.role === 'PRIMARY' ? 'You' : 'Add-on')} (•••• ${c.last4})`,
          }))
      )
    : [];

  const handleAccountChange = (newAccountId: string) => {
    setAccountId(newAccountId);
    const acc = accounts.find((a) => a.id === newAccountId);
    const cardholders =
      acc?.type === AccountType.CREDIT_CARD ? acc.cardholders ?? [] : [];
    const primaryOpenCard = cardholders
      .find((ch) => ch.role === 'PRIMARY')
      ?.cards?.find((c) => !c.closedOn);
    const anyOpenCard = cardholders
      .filter((ch) => !isCardholderClosed(ch))
      .flatMap((ch) => ch.cards ?? [])
      .find((c) => !c.closedOn);
    setCardId(primaryOpenCard?.id ?? anyOpenCard?.id ?? null);
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
  const [mcc, setMcc] = useState<string>(transaction?.mcc ?? '');

  const hasRewardDetails =
    transaction?.settlementDate != null ||
    transaction?.instantDiscount != null ||
    transaction?.convenienceFee != null ||
    transaction?.channel != null ||
    !!transaction?.isEmi ||
    !!transaction?.isInternational;
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
  const isUpdateMode = !!transaction;
  const formRef = useRef<HTMLFormElement | null>(null);

  useEffect(() => {
    setLocalCategories(categories);
  }, [categories]);

  const createCategory = async (categoryName: string) => {
    setCreatingCategory(true);
    const result = await createCategoryAction(categoryName);
    if (result.success) {
      setLocalCategories((prev) => [...prev, result.data]);
      setSelectedCategories((prev) => [...prev, result.data]);
    } else {
      toast.error('Failed to create category: ' + result.error.message);
    }
    setCreatingCategory(false);
  };

  const handleDescriptionBlur = async (
    e: React.FocusEvent<HTMLTextAreaElement>
  ) => {
    if (isUpdateMode) return;
    const description = e.target.value.trim();
    if (
      description.length < 3 ||
      suggestedDescriptionRef.current === description
    ) {
      return;
    }
    suggestedDescriptionRef.current = description;
    setSuggestingCategories(true);
    try {
      const result = await categorizeDescription(description);
      if (result.success && result.data.categories.length > 0) {
        const suggested = result.data.categories.map(
          (c) => categories.find((existing) => existing.id === c.id) ?? c
        );
        setSelectedCategories((prev) => (prev.length === 0 ? suggested : prev));
      }
      if (result.success && result.data.mcc) {
        setMcc((prev) => (!prev ? result.data.mcc! : prev));
      }
    } catch {
      // Silent suggestion
    } finally {
      setSuggestingCategories(false);
    }
  };

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
    const discountValue = instantDiscount.trim()
      ? Number(instantDiscount)
      : null;
    const feeValue = convenienceFee.trim() ? Number(convenienceFee) : null;
    if (
      discountValue != null &&
      (Number.isNaN(discountValue) || discountValue < 0)
    ) {
      toast.error('Instant discount must be a non-negative number.');
      return;
    }
    if (feeValue != null && (Number.isNaN(feeValue) || feeValue < 0)) {
      toast.error('Convenience fee must be a non-negative number.');
      return;
    }
    setIsSubmitting(true);
    try {
      const categoryIds = selectedCategories.map((c) => c.id);
      const transactionRequest: TransactionRequest = {
        accountId,
        cardId: isCreditCard ? cardId || null : null,
        description: form.description.value ?? undefined,
        amount: Number(amount),
        categoryIds,
        date: toCalendarDate(date),
        isTransactionExcluded: isExcluded,
        isTransactionUnderMonitoring: isMonitored,
        monitoringReason: isMonitored ? monitoringReason : undefined,
        mcc: rawMcc || (isUpdateMode ? '' : undefined),
        rewardDetails: {
          settlementDate: settlementDate
            ? toCalendarDate(settlementDate)
            : null,
          instantDiscount: discountValue,
          convenienceFee: feeValue,
          channel: channel === 'NONE' ? null : channel,
          isEmi: isEmi || null,
          isInternational: isInternational || null,
        },
      };
      if (isUpdateMode) {
        transactionRequest.source = transaction?.source ?? 'manual';
        transactionRequest.reviewType = reviewType;
      }
      const res =
        isUpdateMode && transaction
          ? await updateTransaction(transaction.id, transactionRequest)
          : await createTransaction(transactionRequest);
      if (res.success) {
        toast.success('Transaction saved!');
        onSuccess?.();
      } else {
        toast.error(res.error.message);
      }
    } catch (err) {
      toast.error('Error:\n' + (err as Error).message);
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
  };
}

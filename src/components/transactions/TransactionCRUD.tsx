import { CreditCard, FileText, Tag } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import * as React from 'react';
import { toast } from 'sonner';

import { categorizeDescription, createCategory as createCategoryAction } from '@/actions/categories';
import { createTransaction, updateTransaction } from '@/actions/transactions';
import { Combobox } from '@/components/Combobox';
import DayPicker from '@/components/DayPicker';
import { Button } from '@/components/ui/button';
import { FormFieldTextArea } from '@/components/ui/form-field-textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MccInput, isValidMcc } from '@/components/forms/MccInput';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Account } from '@/lib/account.types';
import { Category } from '@/lib/categories.types';
import { ReviewType, Transaction, type TransactionRequest } from '@/lib/transaction.types';
import { cn } from '@/lib/utils';

interface TransactionCRUDProps {
  transaction?: Transaction;
  accounts: Account[];
  categories: Category[];
  onSuccess?: () => void;
  onClose?: () => void;
}

export default function TransactionCRUD({
                                          categories,
                                          transaction,
                                          accounts,
                                          onSuccess,
                                          onClose,
                                        }: TransactionCRUDProps) {
  const [selectedCategories, setSelectedCategories] = useState<Category[]>(transaction?.categories ?? []);
  const [localCategories, setLocalCategories] = useState<Category[]>(categories ?? []);
  const [amount, setAmount] = useState<string>(transaction ? '' + transaction?.amount.toFixed(2) : '-0');
  const [date, setDate] = useState<Date>(transaction ? new Date(transaction.date) : new Date());
  const [creatingCategory, setCreatingCategory] = useState(false);
  const [suggestingCategories, setSuggestingCategories] = useState(false);
  const suggestedDescriptionRef = useRef<string | null>(null);

  const [accountId, setAccountId] = useState<string>(transaction?.accountId ?? '');
  const [isMonitored, setIsMonitored] = useState(transaction?.isTransactionUnderMonitoring ?? false);
  const [monitoringReason, setMonitoringReason] = useState<string>(transaction?.monitoringReason ?? '');
  const [isExcluded, setIsExcluded] = useState(transaction?.isTransactionExcluded ?? false);
  const [reviewType, setReviewType] = useState<ReviewType>(transaction?.reviewType ?? 'MANUALLY_REVIEWED');
  const [mcc, setMcc] = useState<string>(transaction?.mcc ?? '');

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

  const handleDescriptionBlur = async (e: React.FocusEvent<HTMLTextAreaElement>) => {
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
          (c) => categories.find((existing) => existing.id === c.id) ?? c,
        );
        setSelectedCategories((prev) => (prev.length === 0 ? suggested : prev));
      }
      if (result.success && result.data.mcc) {
        setMcc((prev) => (!prev ? result.data.mcc! : prev));
      }
    } catch {
      // Silent: auto-categorization is a best-effort suggestion.
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
    setIsSubmitting(true);
    try {
      const categoryIds = selectedCategories.map(c => c.id);
      const transactionRequest: TransactionRequest = {
        accountId,
        description: form.description.value ?? undefined,
        amount: Number(amount),
        categoryIds,
        date: date.toISOString().split('T')[0],
        isTransactionExcluded: isExcluded,
        isTransactionUnderMonitoring: isMonitored,
        monitoringReason: isMonitored ? monitoringReason : undefined,
        mcc: rawMcc || (isUpdateMode ? '' : undefined),
      };
      if (isUpdateMode) {
        transactionRequest.source = transaction?.source ?? 'manual';
        transactionRequest.reviewType = reviewType;
      }
      const res = isUpdateMode && transaction
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

  return (
    <form
      ref={formRef}
      onSubmit={onSubmit}
      className="flex flex-col h-full max-h-screen bg-slate-50/40 dark:bg-slate-950/20 overflow-hidden"
    >
      {/* Scrollable Form Fields container */}
      <div className="flex-1 overflow-y-auto p-4 space-y-2 pr-2 scrollbar-thin">

        {/* Hero Section: Amount Input & Sign Toggle */}
        <div className="flex items-center justify-between gap-3 pl-2">
          <Label className="flex items-center mb-0 text-xs text-slate-500 dark:text-slate-400 font-medium">
            Amount
          </Label>
          <button
            type="button"
            onClick={() => {
              setAmount((prev) => (prev.startsWith('-') ? prev.slice(1) : `-${prev}`));
            }}
            className="w-12 h-12 flex items-center justify-center font-bold text-sm rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 dark:hover:bg-slate-900 text-slate-700 dark:text-slate-300 transition-all select-none active:scale-95 shadow-sm shrink-0"
          >
            +/-
          </button>
          <div className="relative flex-1">
            <span className={cn(
              'absolute left-4 top-1/2 -translate-y-1/2 text-2xl font-bold transition-colors pointer-events-none',
              amount.startsWith('-') ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400',
            )}>
              ₹
            </span>
            <Input
              id="amount-input"
              type="text"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => {
                let val = e.target.value;
                // Clean up: allow only leading minus, digits, and one decimal point
                const isNegative = val.startsWith('-');
                const cleaned = val.replace(/[^0-9.]/g, '');
                const parts = cleaned.split('.');
                let absoluteVal = parts[0];
                if (parts.length > 1) {
                  absoluteVal += '.' + parts.slice(1).join('');
                }
                const newValue = isNegative ? `-${absoluteVal}` : absoluteVal;
                setAmount(newValue);
              }}
              className={cn(
                'pl-9 pr-3 h-12 text-2xl font-bold rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 shadow-inner transition-all focus-visible:ring-2 focus-visible:ring-emerald-500/20 focus-visible:border-emerald-500 w-full',
                amount.startsWith('-') ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400',
              )}
            />
          </div>
        </div>

        {/* Date Selector Row */}
        <div
          className="bg-white dark:bg-slate-900/60 rounded-xl p-2.5 border border-slate-100 dark:border-slate-800/80 shadow-sm">
          <DayPicker date={date} onSelect={setDate} />
        </div>

        {/* Description & Source Details */}
        <div
          className="bg-white dark:bg-slate-900/60 rounded-xl p-3.5 border border-slate-100 dark:border-slate-800/80 shadow-sm flex flex-col gap-2">
          <Label className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
            <FileText className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
            Description
          </Label>
          <div className="space-y-2">
            <FormFieldTextArea
              placeholder="Add description or notes..."
              name="description"
              defaultValue={transaction?.description}
              onBlur={handleDescriptionBlur}
              autoResize
              hint={suggestingCategories ? 'Suggesting categories…' : undefined}
            />
            {transaction?.sourcedDescription && (<>
                <Label className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
                  Original Description
                </Label>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">
                  {transaction.sourcedDescription}
                </div>
              </>
            )}
          </div>
        </div>

        {/* Group 1: Transaction Details Card */}
        <div
          className="bg-white dark:bg-slate-900/60 rounded-xl p-3.5 border border-slate-100 dark:border-slate-800/80 shadow-sm flex flex-col gap-3"
        >
          {/* Account Selector */}
          <div className="flex gap-2">
            <Label className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
              <CreditCard className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              Account
            </Label>
            <Select
              name="accountId"
              value={accountId}
              onValueChange={setAccountId}
              required
              disabled={isUpdateMode && !!transaction?.accountId}
            >
              <SelectTrigger
                className="w-full bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 text-xs px-3 h-9 border border-slate-200 dark:border-slate-800 rounded-lg font-semibold shadow-none hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors">
                <SelectValue placeholder="Select Account" />
              </SelectTrigger>
              <SelectContent className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id} className="text-xs hover:bg-slate-50 dark:hover:bg-slate-900">
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Category Selector */}
          <div className="flex flex-col gap-1">
            <Label className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400 font-medium">
              <Tag className="w-3.5 h-3.5 text-slate-400 dark:text-slate-500" />
              Category
            </Label>
            <Combobox
              options={localCategories}
              value={selectedCategories}
              onChange={setSelectedCategories}
              canCreate
              onCreate={createCategory}
              loading={creatingCategory}
            />
          </div>

          {/* MCC Code Input */}
          <MccInput
            name="mcc"
            value={mcc}
            onChange={setMcc}
            showHelperText={false}
          />
        </div>

        {/* Group 2: Status & Flags Card */}
        <div
          className="bg-white dark:bg-slate-900/60 rounded-xl p-3.5 border border-slate-100 dark:border-slate-800/80 shadow-sm flex flex-col gap-3.5"
        >
          {/* Dropdown for Review Status (Only in edit mode) */}
          {isUpdateMode && (
            <div className="flex flex-col gap-1">
              <Label className="text-xs text-slate-500 dark:text-slate-400 font-medium">Review Status</Label>
              <Select
                name="reviewType"
                value={reviewType}
                onValueChange={(val) => setReviewType(val as ReviewType)}
              >
                <SelectTrigger
                  className="w-full bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 text-xs px-3 h-9 border border-slate-200 dark:border-slate-800 rounded-lg font-semibold shadow-none hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
                >
                  <SelectValue placeholder="Review Status" />
                </SelectTrigger>
                <SelectContent className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
                  <SelectItem value="NEEDS_REVIEW" className="text-xs hover:bg-slate-50 dark:hover:bg-slate-900">
                    Needs Review
                  </SelectItem>
                  <SelectItem value="AUTO_REVIEWED" className="text-xs hover:bg-slate-50 dark:hover:bg-slate-900">
                    Auto Reviewed
                  </SelectItem>
                  <SelectItem value="MANUALLY_REVIEWED" className="text-xs hover:bg-slate-50 dark:hover:bg-slate-900">
                    Reviewed
                  </SelectItem>
                  <SelectItem value="NA" className="text-xs hover:bg-slate-50 dark:hover:bg-slate-900">
                    Not applicable
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Custom switches for Exclude and Monitor */}
          <div className="flex flex-col gap-2.5 pt-2.5 border-t border-slate-100 dark:border-slate-800/50">
            {/* Exclude Toggle */}
            <div className="flex items-center justify-between py-0.5">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Exclude Transaction</span>
                <span
                  className="text-[10px] text-slate-400 dark:text-slate-500"
                >Do not include in reporting and budgets</span>
              </div>
              <button
                type="button"
                onClick={() => setIsExcluded(prev => !prev)}
                className={cn(
                  'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
                  isExcluded ? 'bg-red-500' : 'bg-slate-200 dark:bg-slate-800',
                )}
              >
                <span
                  className={cn(
                    'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out',
                    isExcluded ? 'translate-x-4' : 'translate-x-0',
                  )}
                />
              </button>
            </div>

            {/* Monitor Toggle */}
            <div
              className="flex items-center justify-between py-0.5 border-t border-slate-100 dark:border-slate-800/50 pt-2.5">
              <div className="flex flex-col gap-0.5">
                <span className="text-xs font-semibold text-slate-700 dark:text-slate-200">Monitor Transaction</span>
                <span
                  className="text-[10px] text-slate-400 dark:text-slate-500">Track changes and alert on activity</span>
              </div>
              <button
                type="button"
                onClick={() => setIsMonitored(prev => !prev)}
                className={cn(
                  'relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border border-transparent transition-colors duration-200 ease-in-out focus:outline-none',
                  isMonitored ? 'bg-amber-500' : 'bg-slate-200 dark:bg-slate-800',
                )}
              >
                <span
                  className={cn(
                    'pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ease-in-out',
                    isMonitored ? 'translate-x-4' : 'translate-x-0',
                  )}
                />
              </button>
            </div>

            {/* Monitoring Reason Input */}
            {isMonitored && (
              <div className="flex flex-col gap-1 pt-2 border-t border-slate-100 dark:border-slate-800/50">
                <Input
                  id="monitoring-reason-input"
                  placeholder="Explain why this transaction is being monitored...(Optional)"
                  value={monitoringReason}
                  onChange={(e) => setMonitoringReason(e.target.value)}
                  className="text-xs h-9 bg-slate-50 dark:bg-slate-950 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800 rounded-lg shadow-none focus-visible:ring-1 focus-visible:ring-amber-500/20 focus-visible:border-amber-500"
                />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Sticky/Fixed Footer Action Buttons */}
      <div
        className="flex gap-3 p-2 border-t border-slate-100 dark:border-slate-800/60 bg-white/70 dark:bg-slate-950/70 backdrop-blur-md">
        <Button
          variant="outline"
          className="flex-1 rounded-xl h-9 text-xs text-slate-600 dark:text-slate-300 font-semibold hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
          size="lg"
          type="button"
          onClick={onClose}
        >
          {isUpdateMode ? 'Back' : 'Close'}
        </Button>
        <Button
          className="flex-1 rounded-xl h-9 text-xs bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-sm transition-all"
          size="lg"
          type="submit"
          disabled={isSubmitting}
        >
          {isSubmitting ? 'Saving...' : 'Save'}
        </Button>
      </div>
    </form>
  );
}
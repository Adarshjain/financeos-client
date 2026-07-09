import { CheckIcon, SquareIcon, XIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { categorizeDescription, createCategory as createCategoryAction } from '@/actions/categories';
import { createTransaction, updateTransaction } from '@/actions/transactions';
import { Combobox } from '@/components/Combobox';
import DayPicker from '@/components/DayPicker';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FormFieldTextArea } from '@/components/ui/form-field-textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  const [isExcluded, setIsExcluded] = useState(transaction?.isTransactionExcluded ?? false);
  const [reviewType, setReviewType] = useState<ReviewType>(transaction?.reviewType ?? 'MANUALLY_REVIEWED');

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
      selectedCategories.length > 0 ||
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
        source: transaction?.source ?? 'manual',
        reviewType: reviewType,
      };
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
    }
  };

  return <form ref={formRef} onSubmit={onSubmit} className="flex flex-col p-4 gap-2 justify-center flex-1">
    <DayPicker date={date} onSelect={setDate} />
    <Select
      name="accountId"
      value={accountId}
      onValueChange={setAccountId}
      required
      disabled={isUpdateMode}
    >
      <SelectTrigger
        className="w-full bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs px-2.5 h-7 border border-slate-200 dark:border-slate-700 rounded-full font-semibold shadow-none hover:bg-slate-200/50 dark:hover:bg-slate-700 transition-colors">
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
    <div className="flex gap-2">
      <Select
        name="reviewType"
        value={reviewType}
        onValueChange={(val) => setReviewType(val as ReviewType)}
      >
        <SelectTrigger
          className="flex-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs px-2.5 h-7 border border-slate-200 dark:border-slate-700 rounded-full font-semibold shadow-none hover:bg-slate-200/50 dark:hover:bg-slate-700 transition-colors">
          <SelectValue placeholder="Review Type" />
        </SelectTrigger>
        <SelectContent className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
          <SelectItem value="NEEDS_REVIEW" className="text-xs hover:bg-slate-50 dark:hover:bg-slate-900">Needs
            Review</SelectItem>
          <SelectItem value="AUTO_REVIEWED" className="text-xs hover:bg-slate-50 dark:hover:bg-slate-900">Auto
            Reviewed</SelectItem>
          <SelectItem value="MANUALLY_REVIEWED"
                      className="text-xs hover:bg-slate-50 dark:hover:bg-slate-900">Reviewed</SelectItem>
        </SelectContent>
      </Select>

      <Badge
        variant={isExcluded ? 'info' : 'default'}
        onClick={() => setIsExcluded(prev => !prev)}
        className="flex-1 text-xs px-2.5 h-7 rounded-full border border-slate-200 dark:border-slate-700 cursor-pointer select-none"
      >
        {isExcluded
          ? <><XIcon className="w-3.5 h-3.5 mr-1" />Excluded</>
          : <><SquareIcon className="w-3.5 h-3.5 mr-1" />Exclude</>
        }
      </Badge>
      <Badge
        variant={isMonitored ? 'warning' : 'default'}
        onClick={() => setIsMonitored(prev => !prev)}
        className="flex-1 w-full text-xs px-2.5 h-7 rounded-full border border-slate-200 dark:border-slate-700 cursor-pointer select-none"
      >
        {isMonitored
          ? <><CheckIcon className="w-3.5 h-3.5 mr-1" />Monitoring</>
          : <><SquareIcon className="w-3.5 h-3.5 mr-1" />Monitor</>
        }
      </Badge>
    </div>
    <Combobox
      options={localCategories}
      value={selectedCategories}
      onChange={setSelectedCategories}
      canCreate
      onCreate={createCategory}
      loading={creatingCategory}
    />
    {transaction?.sourcedDescription ?
      <div className="text-xs"><b>Source Description:</b> {transaction.sourcedDescription}</div> : null}
    <FormFieldTextArea
      placeholder="Description"
      name="description"
      defaultValue={transaction?.description}
      onBlur={handleDescriptionBlur}
      hint={suggestingCategories ? 'Suggesting categories…' : undefined}
    />
    <div className="flex flex-col gap-1 mt-1">
      <Label htmlFor="amount-input">Amount</Label>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            setAmount((prev) => (prev.startsWith('-') ? prev.slice(1) : `-${prev}`));
          }}
          className="w-12 h-10 flex items-center justify-center font-semibold text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-100 hover:bg-slate-200/80 dark:bg-slate-800 dark:hover:bg-slate-700/80 text-slate-700 dark:text-slate-300 transition-all select-none"
        >
          +/-
        </button>
        <div className="relative flex-1">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium text-slate-400 dark:text-slate-500 pointer-events-none">
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
              "pl-7 pr-3 h-10 text-2xl font-medium rounded-xl border border-slate-200 dark:border-slate-700 bg-transparent transition-colors focus-visible:ring-2 focus-visible:ring-slate-500/20 focus-visible:border-slate-500",
              amount.startsWith('-')
                ? "text-red-500"
                : "text-emerald-600 dark:text-emerald-400"
            )}
          />
        </div>
      </div>
    </div>
    <div className="flex gap-2">
      <Button variant="outline" className="flex-1 rounded-xl" size="lg" type="button" onClick={onClose}>Cancel</Button>
      <Button className="flex-1 rounded-xl" size="lg" type="submit">Save</Button>
    </div>
  </form>;
}
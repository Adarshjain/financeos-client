import { CheckIcon, SquareIcon, XIcon } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';

import { createCategory as createCategoryAction } from '@/actions/categories';
import { createTransaction, updateTransaction } from '@/actions/transactions';
import { Combobox } from '@/components/Combobox';
import DayPicker from '@/components/DayPicker';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { FormFieldTextArea } from '@/components/ui/form-field-textarea';
import Keypad from '@/components/ui/Keypad';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Account } from '@/lib/account.types';
import { Category } from '@/lib/categories.types';
import { ReviewType, Transaction, type TransactionRequest } from '@/lib/transaction.types';

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
  const [amount, setAmount] = useState<string>(transaction ? '' + transaction?.amount : '-0');
  const [date, setDate] = useState<Date>(transaction ? new Date(transaction.date) : new Date());
  const [creatingCategory, setCreatingCategory] = useState(false);

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
        reviewType: reviewType
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
    <div className="flex flex-wrap items-center gap-2">
      <Select
        name="accountId"
        value={accountId}
        onValueChange={setAccountId}
        required
        disabled={isUpdateMode}
      >
        <SelectTrigger className="w-[140px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs px-2.5 h-7 border border-slate-200 dark:border-slate-700 rounded-full font-semibold shadow-none hover:bg-slate-200/50 dark:hover:bg-slate-700 transition-colors">
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

      <Select
        name="reviewType"
        value={reviewType}
        onValueChange={(val) => setReviewType(val as ReviewType)}
      >
        <SelectTrigger className="w-[130px] bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs px-2.5 h-7 border border-slate-200 dark:border-slate-700 rounded-full font-semibold shadow-none hover:bg-slate-200/50 dark:hover:bg-slate-700 transition-colors">
          <SelectValue placeholder="Review Type" />
        </SelectTrigger>
        <SelectContent className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950">
          <SelectItem value="NEEDS_REVIEW" className="text-xs hover:bg-slate-50 dark:hover:bg-slate-900">Needs Review</SelectItem>
          <SelectItem value="AUTO_REVIEWED" className="text-xs hover:bg-slate-50 dark:hover:bg-slate-900">Auto Reviewed</SelectItem>
          <SelectItem value="MANUALLY_REVIEWED" className="text-xs hover:bg-slate-50 dark:hover:bg-slate-900">Reviewed</SelectItem>
        </SelectContent>
      </Select>

      <Badge
        variant={isExcluded ? 'info' : 'default'}
        onClick={() => setIsExcluded(prev => !prev)}
        className="text-xs px-2.5 h-7 rounded-full border border-slate-200 dark:border-slate-700 cursor-pointer select-none"
      >
        {isExcluded
          ? <><XIcon className="w-3.5 h-3.5 mr-1" />Excluded</>
          : <><SquareIcon className="w-3.5 h-3.5 mr-1" />Exclude</>
        }
      </Badge>
      <Badge
        variant={isMonitored ? 'warning' : 'default'}
        onClick={() => setIsMonitored(prev => !prev)}
        className="text-xs px-2.5 h-7 rounded-full border border-slate-200 dark:border-slate-700 cursor-pointer select-none"
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
    <FormFieldTextArea
      placeholder="Description"
      name="description"
      defaultValue={transaction?.description}
    />
    <Keypad
      onChange={setAmount}
      amount={transaction != null ? '' + transaction.amount : '-0'}
    />
    <div className="flex gap-2">
      <Button variant="ghost" className="flex-1 rounded-xl" size="lg" type="button" onClick={onClose}>Cancel</Button>
      <Button className="flex-1 rounded-xl" size="lg" type="submit">Save</Button>
    </div>
  </form>;
}
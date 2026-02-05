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
import { NativeSelect } from '@/components/ui/native-select';
import { Account } from '@/lib/account.types';
import { Category } from '@/lib/categories.types';
import { Transaction, type TransactionRequest } from '@/lib/transaction.types';


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
  const [localCategories, setLocalCategories] = useState<Category[]>(categories);
  const [amount, setAmount] = useState<string>(transaction ? '' + transaction?.amount : '-0');
  const [date, setDate] = useState<Date>(transaction ? new Date(transaction.date) : new Date());
  const [creatingCategory, setCreatingCategory] = useState(false);

  const [isMonitored, setIsMonitored] = useState(false);
  const [isExcluded, setIsExcluded] = useState(false);

  const isUpdateMode = !!transaction;
  const formRef = useRef<HTMLFormElement | null>(null);

  const accountOptions = [
    { value: '', label: 'Select Account' },
    ...accounts.map((a) => ({ value: a.id, label: a.name })),
  ];

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
    try {
      const categoryIds = selectedCategories.map(c => c.id);
      const transactionRequest: TransactionRequest = {
        accountId: form.accountId.value,
        description: form.description.value ?? undefined,
        amount: Number(amount),
        categoryIds,
        date: date.toISOString().split('T')[0],
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

  return <form ref={formRef} onSubmit={onSubmit} className="flex flex-col p-4 gap-2 justify-center">
    <DayPicker date={date} onSelect={setDate} />
    <div className="flex gap-1">
      <NativeSelect
        name="accountId"
        options={accountOptions}
        required
        className="inline-flex items-center py-0.5 rounded-full font-medium bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-sm px-2 border"
        defaultValue={transaction?.accountId}
      />
      <Badge
        variant={isExcluded ? 'warning' : 'default'}
        onClick={() => setIsExcluded(prev => !prev)}
        className="text-sm px-2 border"
      >
        {isExcluded
          ? <><XIcon className="w-4 h-4 mr-1" />Excluded</>
          : <><SquareIcon className="w-4 h-4 mr-1" />Exclude</>
        }
      </Badge>
      <Badge
        variant={isMonitored ? 'danger' : 'default'}
        onClick={() => setIsMonitored(prev => !prev)}
        className="text-sm px-2 border"
      >
        {isMonitored
          ? <><CheckIcon className="w-4 h-4 mr-1" />Monitoring</>
          : <><SquareIcon className="w-4 h-4 mr-1" />Monitor</>
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
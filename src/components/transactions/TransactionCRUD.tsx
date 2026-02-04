import { CheckIcon, SquareIcon, XIcon } from 'lucide-react';
import { useActionState, useEffect, useRef, useState } from 'react';

import { createCategory as createCategoryAction } from '@/actions/categories';
import { createTransaction, updateTransaction } from '@/actions/transactions';
import { Combobox } from '@/components/Combobox';
import DayPicker from '@/components/DayPicker';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { FormFieldTextArea } from '@/components/ui/form-field-textarea';
import Keypad from '@/components/ui/Keypad';
import { NativeSelect } from '@/components/ui/native-select';
import { Account } from '@/lib/account.types';
import { Category } from '@/lib/categories.types';
import { Transaction, TransactionRequest } from '@/lib/transaction.types';
import type { ApiResult } from '@/lib/types';
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
  const [localCategories, setLocalCategories] = useState<Category[]>(categories);
  const [amount, setAmount] = useState<string>(transaction ? '' + transaction?.amount : '-0');
  const [date, setDate] = useState<Date>(transaction ? new Date(transaction.date) : new Date());

  const [isMonitored, setIsMonitored] = useState(false);
  const [isExcluded, setIsExcluded] = useState(false);

  const isUpdateMode = !!transaction;
  const updateAction = transaction ? updateTransaction.bind(null, transaction.id) : null;
  const formRef = useRef<HTMLFormElement | null>(null);

  const [state, formAction] = useActionState(
    isUpdateMode && updateAction ? updateAction : createTransaction,
    null as ApiResult<Transaction> | null,
  );


  const accountOptions = [
    { value: '', label: 'Select Account' },
    ...accounts.map((a) => ({ value: a.id, label: a.name })),
  ];

  useEffect(() => {
    setLocalCategories(categories);
  }, [categories]);

  const createCategory = async (categoryName: string) => {
    const result = await createCategoryAction(categoryName);
    if (result.success) {
      setLocalCategories((prev) => [...prev, result.data]);
      setSelectedCategories((prev) => [...prev, result.data]);
    } else {
      alert('Failed to create category:' + result.error.message);
    }
  };

  const onSubmit = () => {
    try {
      const form = formRef.current;
      if (!form) throw new Error('Form not available');

      const tempTransaction: TransactionRequest = {
        accountId: form.accountId.value,
        description: form.description.value,
        amount: Number(amount),
        categoryIds: (transaction?.categories ?? selectedCategories).map(c => c.id),
        date: date.toISOString(),
        metadata: undefined,
        source: transaction?.source ?? 'manual',
        isTransactionExcluded: isExcluded,
        isTransactionUnderMonitoring: isMonitored,
      };

      const formData = new FormData();

      Object.entries(tempTransaction).forEach(([key, value]) => {
        if (value === undefined || value === null) return;

        // Handle arrays properly
        if (Array.isArray(value)) {
          value.forEach(v => formData.append(key, String(v)));
        } else {
          formData.set(key, String(value));
        }
      });

      formAction(formData);
      // onSuccess?.();
    } catch (e) {
      alert(
        'Verify if all the mandatory fields are filled.\n' +
        (e as Error).message
      );
    }
  };


  return <form ref={formRef} onSubmit={onSubmit} className="flex flex-col p-4 gap-2 justify-center">
    {state && !state.success && (
      <Alert variant="destructive">
        <AlertDescription>{state.error.message}</AlertDescription>
      </Alert>
    )}
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
    />
    <FormFieldTextArea
      placeholder="Description"
      name="description"
      defaultValue={transaction?.description}
    />
    <div className={cn(
      'text-5xl text-center my-6 mt-auto',
      parseFloat(amount) !== 0 && (parseFloat(amount) > 0 ? 'text-emerald-400' : 'text-red-400'),
    )}>{amount}</div>
    <Keypad
      onChange={setAmount}
      amount={transaction != null ? '' + transaction.amount : '-0'}
      onClose={onClose}
      done={onSubmit}
    />
  </form>;
}
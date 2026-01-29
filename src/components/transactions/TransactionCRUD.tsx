import { CheckIcon, SquareIcon, XIcon } from 'lucide-react';
import { useEffect, useState } from 'react';

import { createCategory as createCategoryAction } from '@/actions/categories';
import { Combobox } from '@/components/Combobox';
import DayPicker from '@/components/DayPicker';
import { Badge } from '@/components/ui/badge';
import { FormField } from '@/components/ui/form-field';
import { FormFieldTextArea } from '@/components/ui/form-field-textarea';
import Keypad from '@/components/ui/Keypad';
import { NativeSelect } from '@/components/ui/native-select';
import { Account } from '@/lib/account.types';
import { Category } from '@/lib/categories.types';
import { Transaction } from '@/lib/transaction.types';


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
  const [selectedCategories, setSelectedCategories] = useState(transaction?.categories ?? []);
  const [localCategories, setLocalCategories] = useState<Category[]>(categories);
  const [amount, setAmount] = useState<string>('0');

  const [isMonitored, setIsMonitored] = useState(false);
  const [isExcluded, setIsExcluded] = useState(false);

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
      setSelectedCategories((prev) => [...prev, result.data.id]);
    } else {
      alert('Failed to create category:' + result.error.message);
    }
  };

  return <div className="flex flex-col p-4 gap-2 justify-center">
    <DayPicker date={transaction ? new Date(transaction.date) : undefined} />
    <div className="flex gap-2">
      <NativeSelect
        name="accountId"
        options={accountOptions}
        required
        className="w-7/10"
        defaultValue={transaction?.accountId}
      />
      <Badge
        variant={isExcluded ? 'warning' : 'default'}
        onClick={() => setIsExcluded(prev => !prev)}
        className="text-xs px-2"
      >
        {isExcluded
          ? <><XIcon className="w-4 h-4 mr-1" />Excluded</>
          : <><SquareIcon className="w-4 h-4 mr-1" />Exclude</>
        }
      </Badge>
      <Badge
        variant={isMonitored ? 'danger' : 'default'}
        onClick={() => setIsMonitored(prev => !prev)}
        className="text-xs px-2"
      >
        {isMonitored
          ? <><CheckIcon className="w-4 h-4 mr-1" />Monitoring</>
          : <><SquareIcon className="w-4 h-4 mr-1" />Monitor</>
        }
      </Badge>
    </div>
    <Combobox
      options={localCategories.map(({ id, name }) => ({ value: id, label: name }))}
      value={selectedCategories}
      onChange={setSelectedCategories}
      canCreate
      onCreate={createCategory}
    />
    <FormField
      placeholder="Description"
      name="description"
      defaultValue={transaction?.description}
    />
    <FormFieldTextArea
      placeholder="Notes"
      name="notes"
      defaultValue={transaction?.notes}
    />
    <div className="text-5xl text-center my-6 mt-auto">{amount}</div>
    <Keypad onChange={setAmount} onClose={onClose} done={onSuccess} />
  </div>;
}
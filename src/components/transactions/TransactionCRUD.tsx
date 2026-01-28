import { useEffect, useState } from 'react';

import { createCategory as createCategoryAction } from '@/actions/categories';
import { Combobox } from '@/components/Combobox';
import Keypad from '@/components/ui/Keypad';
import { Account } from '@/lib/account.types';
import { Category } from '@/lib/categories.types';
import { Transaction } from '@/lib/transaction.types';


interface TransactionCRUDProps {
  transaction?: Transaction;
  accounts: Account[];
  categories: Category[];
  onSuccess?: () => void;
}

export default function TransactionCRUD({ categories, transaction, accounts, onSuccess }: TransactionCRUDProps) {
  const [selectedCategories, setSelectedCategories] = useState(transaction?.categories ?? []);
  const [localCategories, setLocalCategories] = useState<Category[]>(categories);
  const [amount, setAmount] = useState<string>('0');

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

  return <div className="p-4">
    <Combobox
      options={localCategories.map(({ id, name }) => ({ value: id, label: name }))}
      value={selectedCategories}
      onChange={setSelectedCategories}
      canCreate
      onCreate={createCategory}
    />
    <div className="text-5xl text-center my-6">{amount}</div>
    <Keypad onChange={setAmount} />
  </div>;
}
import { createDataTableColumnHelper, Highlight, Text } from '@/components/ds';

export interface TransactionRowData {
  id: string;
  date: string;
  description: string;
  category?: string;
  account?: string;
  plastic?: string;
  amount: number | string;
  formattedAmount?: string;
  isCredit?: boolean;
  balance?: string;
  note?: string;
  reviewStatus?: string;
  provenance?: React.ReactNode;
  [key: string]: unknown;
}

const helper = createDataTableColumnHelper<TransactionRowData>();

/** Columns whose description, category, account and amount cells mark `query` matches. */
export const createTransactionColumns = (query?: string) => {
  const mark = (value: string) =>
    query ? <Highlight text={value} query={query} /> : value;
  return helper.columns([
  helper.accessor('date', {
    id: 'date',
    header: 'Date',
    meta: { size: 'sm', sortable: true },
    cell: ({ row }) => row.original.date,
  }),
  helper.accessor('description', {
    id: 'description',
    header: 'Description',
    meta: { size: 'fill', sortable: true, wrap: true, phone: 'main' },
    cell: ({ row }) => mark(row.original.description),
  }),
  helper.accessor('category', {
    id: 'category',
    header: 'Category',
    meta: { size: 'md' },
    cell: ({ row }) => mark(row.original.category ?? ''),
  }),
  helper.accessor('account', {
    id: 'account',
    header: 'Account',
    meta: { size: 'sm' },
    cell: ({ row }) => mark(row.original.account ?? ''),
  }),
  helper.accessor('amount', {
    id: 'amount',
    header: 'Amount',
    meta: { size: 'sm', align: 'end', sortable: true, phone: 'amount' },
    cell: ({ row }) => {
      const text = row.original.formattedAmount ?? String(row.original.amount);
      return query ? (
        mark(text)
      ) : (
        <Text variant="body" tone={row.original.isCredit ? 'positive' : 'ink'} fraction="small">
          {text}
        </Text>
      );
    },
  }),
  helper.accessor('balance', {
    id: 'balance',
    header: 'Balance',
    meta: { size: 'sm', align: 'end' },
    cell: ({ row }) => row.original.balance ?? '',
  }),
]);
};

export const transactionColumns = createTransactionColumns();

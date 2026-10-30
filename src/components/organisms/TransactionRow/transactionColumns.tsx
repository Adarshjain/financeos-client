import { Conceal, useConcealed } from '@/components/ds/Conceal/Conceal';
import { createDataTableColumnHelper } from '@/components/ds/DataTable/types';
import { Highlight } from '@/components/ds/Highlight/Highlight';
import { Text } from '@/components/ds/Text/Text';

export interface TransactionRowData {
  id: string;
  date: string;
  description: string;
  category?: string;
  account?: string;
  /** The account's bank id, when it has one; the row shows its logo before the name. */
  bankId?: string;
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
    meta: { size: 'date', sortable: true },
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
        <Conceal whole>{mark(text)}</Conceal>
      ) : (
        <AmountText text={text} isCredit={row.original.isCredit} />
      );
    },
  }),
  helper.accessor('balance', {
    id: 'balance',
    header: 'Balance',
    meta: { size: 'sm', align: 'end' },
    cell: ({ row }) => (row.original.balance ? <Conceal whole placeholder="">{row.original.balance}</Conceal> : ''),
  }),
]);
};

export const transactionColumns = createTransactionColumns();

/** Desktop amount cell: a credit is green only while amounts show, so a hidden one gives nothing away. */
function AmountText({ text, isCredit }: { text: string; isCredit?: boolean }) {
  const concealed = useConcealed();
  return (
    <Text variant="body" tone={isCredit && !concealed ? 'positive' : 'ink'} fraction="small">
      {text}
    </Text>
  );
}

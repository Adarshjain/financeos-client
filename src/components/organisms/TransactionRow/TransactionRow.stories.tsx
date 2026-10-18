import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { useArgs } from 'storybook/preview-api';
import { fn } from 'storybook/test';

import {
  Avatar,
  Card,
  cn,
  ConfirmDialog,
  DataTable,
  Dialog,
  DialogBody,
  DialogContent,
  EmptyState,
  Icon,
  ListRow,
  Pager,
  Select,
  SelectionBar,
  showToast,
  SwipeActions,
  Text,
  Toaster,
} from '@/components/ds';
import {
  transactionColumns,
  type TransactionLink,
  TransactionRow,
  type TransactionRowData,
} from '@/components/organisms';

const meta: Meta<typeof TransactionRow> = {
  title: 'Organisms/TransactionRow',
  component: TransactionRow,
  parameters: {
    layout: 'padded',
  },
  decorators: [
    // Single-row stories sit in a phone-width card; list stories (frame: 'page') bring their own frame.
    (Story, { parameters }) =>
      parameters.frame === 'page' ? (
        <Story />
      ) : (
        <Card className="max-w-sm w-full p-0 overflow-hidden">
          <Story />
        </Card>
      ),
  ],
  argTypes: {
    description: {
      control: 'text',
      description: 'Merchant or main transaction description',
    },
    amount: {
      control: 'text',
      description: 'Formatted transaction amount',
    },
    balance: {
      control: 'text',
      description: 'Running balance below amount',
    },
    account: {
      control: 'text',
      description: 'Account name',
    },
    plastic: {
      control: 'text',
      description: 'Plastic / card suffix (••7741)',
    },
    reviewStatus: {
      control: 'text',
      description: 'Amber review status word',
    },
    provenance: {
      control: 'text',
      description: 'Provenance source (Statement, Gmail, Manual)',
    },
    isCredit: {
      control: 'boolean',
      description: 'Whether amount is credit (+ positive)',
    },
    selected: {
      control: 'boolean',
      description: 'Selected row state with 4px stripe',
    },
    selectable: {
      control: 'boolean',
      description: 'Whether row is selectable',
    },
    tone: {
      control: 'select',
      options: ['default', 'warning'],
      description: 'Visual tone (default or warning)',
    },
    disabled: {
      control: 'boolean',
      description: 'Disabled state (dimmed)',
    },
    selectionMode: {
      control: 'boolean',
      description: 'Shows trailing eye button',
    },
    chevron: {
      control: 'boolean',
      description: 'Shows trailing chevron icon',
    },
    borderTop: {
      control: 'boolean',
      description: 'Shows top border line',
    },
    categories: {
      control: 'object',
      description: 'Assigned categories array',
    },
    link: {
      control: 'object',
      description: 'Link object or label',
    },
    note: {
      control: 'text',
      description: 'Note text',
    },
    unsetCategoryLabel: {
      control: 'text',
      description: 'Label for unset category',
    },
    leading: {
      control: false,
    },
    contextLine: {
      control: false,
    },
  },
  args: {
    onDetail: fn(),
    onSetCategory: fn(),
    onCategoryClick: fn(),
    onMoreCategoriesClick: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof TransactionRow>;

/* ------------------------------------------------------------------ */
/* Transactions list: the whole row as a page would use it.           */
/* ------------------------------------------------------------------ */

interface LiveTransaction extends TransactionRowData {
  /** ISO day, used for sorting and the day and month groups. */
  day: string;
  amount: number;
  account: string;
  categories: string[];
  balanceInr?: number;
  link?: string | TransactionLink;
  tone?: 'default' | 'warning';
  excluded?: boolean;
}

const liveTransactions: LiveTransaction[] = [
  {
    id: 'oct-01',
    day: '2026-10-12',
    date: '12 Oct',
    description: 'BigBasket',
    account: 'HDFC Bank Savings',
    amount: 3600,
    balanceInr: 295030,
    reviewStatus: 'Unreconciled',
    provenance: 'Statement',
    categories: ['Groceries'],
  },
  {
    id: 'oct-02',
    day: '2026-10-12',
    date: '12 Oct',
    description: 'Uber',
    account: 'Paytm Wallet',
    amount: 533,
    balanceInr: 2844,
    categories: ['Transport'],
  },
  {
    id: 'oct-03',
    day: '2026-10-11',
    date: '11 Oct',
    description: 'Swiggy Bangalore',
    account: 'HDFC Bank Savings',
    amount: 1249,
    balanceInr: 298630,
    reviewStatus: 'Unreconciled',
    provenance: 'Gmail',
    categories: ['Food & dining'],
  },
  {
    id: 'oct-04',
    day: '2026-10-11',
    date: '11 Oct',
    description: 'Swiggy Bangalore',
    account: 'HDFC Regalia',
    plastic: '••7741',
    amount: 1249,
    balanceInr: 44319,
    reviewStatus: 'Duplicate',
    provenance: 'Statement',
    categories: ['Food & dining', 'Delivery'],
  },
  {
    id: 'oct-05',
    day: '2026-10-11',
    date: '11 Oct',
    description: 'Auto rickshaw',
    account: 'Cash in hand',
    amount: 350,
    balanceInr: 6750,
    provenance: 'Manual',
    categories: ['Transport'],
  },
  {
    id: 'oct-06',
    day: '2026-10-11',
    date: '11 Oct',
    description: 'BMRCL Metro recharge',
    account: 'HDFC Bank Savings',
    amount: 500,
    balanceInr: 299879,
    categories: ['Transport'],
  },
  {
    id: 'oct-07',
    day: '2026-10-10',
    date: '10 Oct',
    description: 'Ola Cabs',
    account: 'Paytm Wallet',
    amount: 165,
    balanceInr: 3377,
    categories: ['Transport'],
  },
  {
    id: 'oct-08',
    day: '2026-10-09',
    date: '9 Oct',
    description: 'NEFT CR · Freelance invoice 0932',
    account: 'HDFC Bank Savings',
    amount: 18500,
    isCredit: true,
    balanceInr: 300379,
    provenance: 'Gmail',
    categories: [],
  },
  {
    id: 'oct-09',
    day: '2026-10-09',
    date: '9 Oct',
    description: 'Ola Cabs',
    account: 'HDFC Bank Savings',
    amount: 321,
    balanceInr: 281879,
    categories: ['Transport'],
  },
  {
    id: 'oct-10',
    day: '2026-10-08',
    date: '8 Oct',
    description: 'Flipkart',
    account: 'SBI Cashback',
    plastic: '••3356',
    amount: 3679,
    balanceInr: 6224,
    categories: ['Shopping', 'Electronics', 'Gifts'],
  },
  {
    id: 'oct-11',
    day: '2026-10-07',
    date: '7 Oct',
    description: 'Transfer to Zerodha',
    account: 'HDFC Bank Savings',
    amount: 25000,
    balanceInr: 282200,
    link: { label: 'Transfer out' },
    categories: ['Investments'],
  },
  {
    id: 'oct-12',
    day: '2026-10-07',
    date: '7 Oct',
    description: 'HDFC Car Loan EMI',
    account: 'HDFC Bank Savings',
    amount: 17760,
    balanceInr: 307200,
    link: { label: 'EMI #8 · HDFC car loan', isRecord: true },
    categories: ['EMI'],
  },
  {
    id: 'oct-13',
    day: '2026-10-05',
    date: '5 Oct',
    description: 'Truffles St Marks Road',
    account: 'Amex Platinum',
    plastic: '••1008',
    amount: 1860,
    reviewStatus: 'Watching',
    provenance: 'Manual',
    note: 'Team dinner, split pending',
    tone: 'warning',
    categories: [],
  },
  {
    id: 'oct-14',
    day: '2026-10-04',
    date: '4 Oct',
    description: 'Transfer to self',
    account: 'HDFC Bank Savings',
    amount: 10000,
    provenance: 'Excluded',
    excluded: true,
    categories: ['Transfers'],
  },
  {
    id: 'oct-15',
    day: '2026-10-03',
    date: '3 Oct',
    description: 'Rent · Prestige Lakeside',
    account: 'HDFC Bank Savings',
    amount: 32000,
    balanceInr: 324960,
    note: 'October rent',
    categories: ['Rent'],
  },
  {
    id: 'oct-16',
    day: '2026-10-02',
    date: '2 Oct',
    description: 'Amazon Pay refund',
    account: 'Amazon Pay',
    amount: 1299,
    isCredit: true,
    balanceInr: 4143,
    provenance: 'Gmail',
    categories: ['Refunds'],
  },
  {
    id: 'oct-17',
    day: '2026-10-01',
    date: '1 Oct',
    description: 'Salary · Bolt Technologies',
    account: 'ICICI Salary Account',
    amount: 215000,
    isCredit: true,
    balanceInr: 561400,
    provenance: 'Statement',
    categories: ['Salary'],
  },
  {
    id: 'sep-01',
    day: '2026-09-29',
    date: '29 Sep',
    description: 'Truffles St Marks Road',
    account: 'HDFC Regalia',
    plastic: '••7741',
    amount: 1860,
    balanceInr: 65357,
    categories: [],
  },
  {
    id: 'sep-02',
    day: '2026-09-28',
    date: '28 Sep',
    description: 'Starbucks Indiranagar',
    account: 'Amex Platinum',
    plastic: '••1008',
    amount: 366,
    balanceInr: 34266,
    categories: ['Food & dining'],
  },
  {
    id: 'sep-03',
    day: '2026-09-27',
    date: '27 Sep',
    description: 'Croma Koramangala',
    account: 'HDFC Regalia',
    plastic: '••7741',
    amount: 54990,
    balanceInr: 63497,
    reviewStatus: 'Unreconciled',
    provenance: 'Gmail',
    categories: ['Electronics'],
  },
  {
    id: 'sep-04',
    day: '2026-09-25',
    date: '25 Sep',
    description: 'Netflix',
    account: 'HDFC Regalia',
    plastic: '••7741',
    amount: 649,
    balanceInr: 8507,
    categories: ['Subscriptions'],
  },
  {
    id: 'sep-05',
    day: '2026-09-24',
    date: '24 Sep',
    description: 'Card bill payment',
    account: 'HDFC Bank Savings',
    amount: 44319,
    balanceInr: 270420,
    link: { label: 'Transfer out' },
    categories: ['Bills'],
  },
  {
    id: 'sep-06',
    day: '2026-09-22',
    date: '22 Sep',
    description: 'Apollo Pharmacy',
    account: 'Paytm Wallet',
    amount: 842,
    balanceInr: 2011,
    categories: ['Health'],
  },
  {
    id: 'sep-07',
    day: '2026-09-20',
    date: '20 Sep',
    description: 'Zomato',
    account: 'HDFC Regalia',
    plastic: '••7741',
    amount: 612,
    balanceInr: 7858,
    reviewStatus: 'Duplicate',
    provenance: 'Gmail',
    categories: ['Food & dining'],
  },
  {
    id: 'sep-08',
    day: '2026-09-18',
    date: '18 Sep',
    description: 'BESCOM electricity',
    account: 'HDFC Bank Savings',
    amount: 2340,
    balanceInr: 314739,
    categories: ['Utilities'],
  },
  {
    id: 'sep-09',
    day: '2026-09-15',
    date: '15 Sep',
    description: 'Interest credit',
    account: 'ICICI Salary Account',
    amount: 1840,
    isCredit: true,
    balanceInr: 346400,
    provenance: 'Statement',
    categories: ['Interest'],
  },
  {
    id: 'sep-10',
    day: '2026-09-12',
    date: '12 Sep',
    description: 'Decathlon Whitefield',
    account: 'SBI Cashback',
    plastic: '••3356',
    amount: 3499,
    balanceInr: 2545,
    categories: ['Sports', 'Shopping'],
  },
  {
    id: 'sep-11',
    day: '2026-09-08',
    date: '8 Sep',
    description: 'Indian Oil petrol',
    account: 'HDFC Regalia',
    plastic: '••7741',
    amount: 2100,
    balanceInr: 8470,
    categories: ['Fuel'],
  },
  {
    id: 'sep-12',
    day: '2026-09-03',
    date: '3 Sep',
    description: 'Rent · Prestige Lakeside',
    account: 'HDFC Bank Savings',
    amount: 32000,
    balanceInr: 317079,
    note: 'September rent',
    categories: ['Rent'],
  },
  {
    id: 'sep-13',
    day: '2026-09-01',
    date: '1 Sep',
    description: 'Salary · Bolt Technologies',
    account: 'ICICI Salary Account',
    amount: 215000,
    isCredit: true,
    balanceInr: 344560,
    provenance: 'Statement',
    categories: ['Salary'],
  },
];

const categoryOptions = [
  'Bills',
  'Delivery',
  'Electronics',
  'EMI',
  'Food & dining',
  'Fuel',
  'Gifts',
  'Groceries',
  'Health',
  'Interest',
  'Investments',
  'Refunds',
  'Rent',
  'Salary',
  'Shopping',
  'Sports',
  'Subscriptions',
  'Transfers',
  'Transport',
  'Utilities',
].map((c) => ({ value: c, label: c }));

/** Review words that Approve clears. "Watching" is a monitor, not a review flag. */
const reviewWords = new Set(['Unreconciled', 'Duplicate']);

const inr = new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});
const inrWhole = new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 });
const formatAmount = (t: LiveTransaction) =>
  `${t.isCredit ? '+' : ''}${inr.format(t.amount)}`;
const monthLabel = (day: string) =>
  new Date(`${day}T00:00:00`).toLocaleDateString('en-IN', {
    month: 'long',
    year: 'numeric',
  });
const weekday = (day: string) =>
  new Date(`${day}T00:00:00`).toLocaleDateString('en-IN', { weekday: 'short' });
const longDate = (day: string) =>
  new Date(`${day}T00:00:00`).toLocaleDateString('en-IN', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
const outOf = (rows: LiveTransaction[]) =>
  rows
    .filter((t) => !t.isCredit && !t.excluded)
    .reduce((sum, t) => sum + t.amount, 0);
const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

type SortState = { id: string; desc: boolean } | null;

interface LiveArgs {
  selection: string[];
  allSelected: boolean;
  sort: SortState;
  page: number;
  size: number;
  /** Row open in the detail dialog. */
  detailId: string | null;
  /** Row whose categories are being edited, and the unsaved pick. */
  categoryEditId: string | null;
  categoryDraft: string[];
  /** Rows waiting on the delete confirmation. */
  confirmDeleteIds: string[];
  approvedIds: string[];
  deletedIds: string[];
  categoryOverrides: Record<string, string[]>;
}

/** Stands in for the server: applies the user's edits, then sorts and pages. */
function queryTransactions(args: LiveArgs) {
  const deleted = new Set(args.deletedIds);
  const approved = new Set(args.approvedIds);
  const all = liveTransactions
    .filter((t) => !deleted.has(t.id))
    .map(
      (t): LiveTransaction => ({
        ...t,
        reviewStatus:
          approved.has(t.id) && reviewWords.has(t.reviewStatus ?? '')
            ? undefined
            : t.reviewStatus,
        categories: args.categoryOverrides[t.id] ?? t.categories,
      })
    );
  const sort = args.sort ?? { id: 'date', desc: true };
  const key = (t: LiveTransaction) =>
    sort.id === 'amount'
      ? t.amount
      : sort.id === 'description'
        ? t.description.toLowerCase()
        : t.day;
  const sorted = [...all].sort((a, b) => {
    const ka = key(a);
    const kb = key(b);
    // Ties keep the fixture's order, whichever way the column is sorted.
    if (ka === kb) return a.id.localeCompare(b.id);
    const order = ka < kb ? -1 : 1;
    return sort.desc ? -order : order;
  });
  const lastPage = Math.max(0, Math.ceil(sorted.length / args.size) - 1);
  const page = Math.min(args.page, lastPage);
  return {
    all,
    page,
    rows: sorted.slice(page * args.size, (page + 1) * args.size),
    byDate: sort.id === 'date',
  };
}

const isFlagged = (t: LiveTransaction) => reviewWords.has(t.reviewStatus ?? '');

/** DataTable hands back rows typed by transactionColumns; the rows it gets are LiveTransaction. */
const asLive = (row: TransactionRowData) => row as LiveTransaction;

export const TransactionsList: StoryObj = {
  parameters: {
    frame: 'page',
    // The canvas follows the window, so resizing across 1024px switches phone and desktop.
    docs: {
      description: {
        story:
          'The row inside a full transactions list, wired like the page. Phone layout (below 1024px, touch or mouse): long-press a row to start selecting, tap to toggle, the eye opens the detail; outside selection a tap opens the row; swipe right approves a flagged row (Undo in the toast), swipe left deletes after a confirmation. Desktop layout: a click always opens the row, the checkbox selects; no long-press or swipe. Tap a category chip to change it. Sort from the desktop headers, page with the pager. Resize the window across 1024px to switch between phone and desktop.',
      },
    },
  },
  globals: { viewport: { value: '100pct-100pct', isRotated: false } },
  args: {
    selection: [],
    allSelected: false,
    sort: { id: 'date', desc: true },
    page: 0,
    size: 10,
    detailId: null,
    categoryEditId: null,
    categoryDraft: [],
    confirmDeleteIds: [],
    approvedIds: [],
    deletedIds: [],
    categoryOverrides: {},
  },
  argTypes: {
    selection: { control: 'object' },
    allSelected: { control: 'boolean' },
    sort: { control: 'object' },
    page: { control: { type: 'number', min: 0 } },
    size: { control: 'select', options: [10, 25, 50] },
    detailId: { control: false },
    categoryEditId: { control: false },
    categoryDraft: { control: false },
    confirmDeleteIds: { control: false },
    approvedIds: { control: 'object' },
    deletedIds: { control: 'object' },
    categoryOverrides: { control: 'object' },
  },
  render: function TransactionsListStory() {
    const [args, updateArgs] = useArgs<LiveArgs>();
    const { all, page, rows, byDate } = queryTransactions(args);
    const byId = new Map(all.map((t) => [t.id, t]));
    const selectedIds = args.allSelected
      ? all.map((t) => t.id)
      : args.selection.filter((id) => byId.has(id));
    const selectedRows = selectedIds.map((id) => byId.get(id)!).filter(Boolean);
    const flaggedSelected = selectedRows.filter(isFlagged);
    const detail = args.detailId ? byId.get(args.detailId) : undefined;
    const editing = args.categoryEditId
      ? byId.get(args.categoryEditId)
      : undefined;
    const pendingDelete = args.confirmDeleteIds
      .map((id) => byId.get(id))
      .filter((t): t is LiveTransaction => Boolean(t));

    const clearSelection = () =>
      updateArgs({ selection: [], allSelected: false });
    const approve = (ids: string[]) => {
      const before = args.approvedIds;
      updateArgs({
        approvedIds: [...new Set([...before, ...ids])],
        selection: [],
        allSelected: false,
        detailId: null,
      });
      const only = ids.length === 1 ? byId.get(ids[0]) : undefined;
      showToast(
        only
          ? `Approved ${only.description}`
          : `Approved ${plural(ids.length, 'transaction')}`,
        {
          action: {
            label: 'Undo',
            onSelect: () => updateArgs({ approvedIds: before }),
          },
        }
      );
    };
    const askDelete = (ids: string[]) =>
      updateArgs({ confirmDeleteIds: ids, detailId: null });
    const confirmDelete = () => {
      const ids = args.confirmDeleteIds;
      updateArgs({
        deletedIds: [...args.deletedIds, ...ids],
        selection: args.selection.filter((id) => !ids.includes(id)),
        allSelected: false,
        confirmDeleteIds: [],
      });
      showToast(`Deleted ${plural(ids.length, 'transaction')}`);
    };
    const editCategories = (t: LiveTransaction) =>
      updateArgs({
        categoryEditId: t.id,
        categoryDraft: t.categories,
        detailId: null,
      });

    const pager = (
      <Pager
        variant="compact"
        page={page}
        size={args.size}
        totalElements={all.length}
        unit="transactions"
        sizeOptions={[10, 25, 50]}
        onPageChange={(p) => updateArgs({ page: p })}
        onSizeChange={(s) => updateArgs({ size: s, page: 0 })}
      />
    );

    return (
      <div
        className={cn(
          'mx-auto w-full max-w-container-xl',
          selectedIds.length > 0 && 'pb-bottom-clearance'
        )}
      >
        <Card className="p-0">
          <DataTable
            columns={transactionColumns}
            data={rows}
            getRowId={(r) => r.id}
            sort={args.sort}
            onSortChange={(s) => updateArgs({ sort: s, page: 0 })}
            selectable
            selection={args.selection}
            onSelectionChange={(s) => updateArgs({ selection: s })}
            allSelected={args.allSelected}
            onAllSelectedChange={(a) => updateArgs({ allSelected: a })}
            onRowSelect={(r) => updateArgs({ detailId: r.id })}
            band={(row) => {
              const r = asLive(row);
              if (!byDate) return null;
              const month = r.day.slice(0, 7);
              const inMonth = all.filter((t) => t.day.startsWith(month));
              return {
                key: month,
                label: `${monthLabel(r.day)} · ${plural(inMonth.length, 'transaction')} · out ₹${inrWhole.format(outOf(inMonth))}`,
              };
            }}
            dayHeader={(row) => {
              const r = asLive(row);
              return byDate
                ? { key: r.day, label: r.date, sublabel: weekday(r.day) }
                : null;
            }}
            pager={pager}
            empty={
              <EmptyState
                title="No transactions"
                description="Deleted transactions leave the list."
              />
            }
            wrapRow={(row, node) => {
              const r = asLive(row);
              return (
                <SwipeActions
                  key={r.id}
                  disabled={r.excluded}
                  left={{
                    label: 'Approve',
                    icon: <Icon name="check" size="md" />,
                    tone: 'brand',
                    disabled: !isFlagged(r),
                    onTrigger: () => approve([r.id]),
                  }}
                  right={{
                    label: 'Delete',
                    icon: <Icon name="delete" size="md" />,
                    tone: 'danger',
                    onTrigger: () => askDelete([r.id]),
                  }}
                >
                  {node}
                </SwipeActions>
              );
            }}
            renderRow={(row, rowProps) => {
              const r = asLive(row);
              return (
                <TransactionRow
                  key={r.id}
                  date={r.date}
                  description={r.description}
                  amount={formatAmount(r)}
                  isCredit={r.isCredit}
                  balance={
                    r.balanceInr === undefined
                      ? undefined
                      : `₹${inrWhole.format(r.balanceInr)}`
                  }
                  account={r.account}
                  plastic={r.plastic}
                  reviewStatus={r.reviewStatus}
                  note={r.note}
                  link={r.link}
                  provenance={r.provenance}
                  categories={r.categories}
                  unsetCategoryLabel="Set category"
                  onSetCategory={() => editCategories(r)}
                  onCategoryClick={() => editCategories(r)}
                  onMoreCategoriesClick={() => editCategories(r)}
                  tone={r.tone}
                  disabled={r.excluded}
                  selectable={rowProps.selectable}
                  selected={rowProps.selected}
                  onSelectedChange={rowProps.onSelectedChange}
                  selectionMode={rowProps.selectionMode}
                  onDetail={rowProps.onSelect}
                />
              );
            }}
          />
        </Card>

        <SelectionBar
          className="fixed inset-x-0 bottom-0 desk:bottom-safe-12"
          count={selectedIds.length}
          summary={`₹${inrWhole.format(outOf(selectedRows))} out${flaggedSelected.length ? ` · ${flaggedSelected.length} need review` : ''}`}
          onClear={clearSelection}
          onSelectAll={
            args.allSelected
              ? undefined
              : () => updateArgs({ allSelected: true })
          }
          selectAllLabel={`Select all ${all.length}`}
          actions={[
            {
              id: 'approve',
              label: 'Approve',
              icon: <Icon name="check" size="lg" />,
              hint: `${flaggedSelected.length} flagged`,
              disabled: flaggedSelected.length === 0,
              onSelect: () => approve(flaggedSelected.map((t) => t.id)),
            },
            {
              id: 'delete',
              label: 'Delete',
              icon: <Icon name="delete" size="lg" />,
              tone: 'danger',
              onSelect: () => askDelete(selectedIds),
            },
          ]}
        />

        <Dialog
          open={Boolean(detail)}
          onOpenChange={(open) => !open && updateArgs({ detailId: null })}
        >
          {detail && (
            <DialogContent
              title={detail.description}
              description={longDate(detail.day)}
              primary={
                isFlagged(detail)
                  ? { label: 'Approve', onSelect: () => approve([detail.id]) }
                  : undefined
              }
              secondary={{
                label: 'Set category',
                onSelect: () => editCategories(detail),
              }}
              tertiary={{
                label: 'Delete transaction',
                onSelect: () => askDelete([detail.id]),
              }}
            >
              <DialogBody>
                <Text
                  as="p"
                  variant="figure"
                  tone={detail.isCredit ? 'positive' : 'ink'}
                >
                  ₹{formatAmount(detail)}
                </Text>
                <div>
                  <ListRow
                    title="Account"
                    trailing={[detail.account, detail.plastic]
                      .filter(Boolean)
                      .join(' ')}
                  />
                  <ListRow
                    title="Category"
                    trailing={detail.categories.join(', ') || 'Not set'}
                  />
                  {detail.balanceInr !== undefined && (
                    <ListRow
                      title="Balance after"
                      trailing={`₹${inrWhole.format(detail.balanceInr)}`}
                    />
                  )}
                  {detail.reviewStatus && (
                    <ListRow title="Review" trailing={detail.reviewStatus} />
                  )}
                  {detail.link && (
                    <ListRow
                      title="Linked to"
                      trailing={
                        typeof detail.link === 'string'
                          ? detail.link
                          : detail.link.label
                      }
                    />
                  )}
                  {detail.note && (
                    <ListRow title="Note" trailing={detail.note} />
                  )}
                  {detail.provenance && (
                    <ListRow title="Source" trailing={detail.provenance} />
                  )}
                </div>
              </DialogBody>
            </DialogContent>
          )}
        </Dialog>

        <Dialog
          open={Boolean(editing)}
          onOpenChange={(open) => !open && updateArgs({ categoryEditId: null })}
        >
          {editing && (
            <DialogContent
              size="sm"
              title="Set category"
              description={`${editing.description} · ₹${formatAmount(editing)}`}
              primary={{
                label: 'Save category',
                onSelect: () =>
                  updateArgs({
                    categoryOverrides: {
                      ...args.categoryOverrides,
                      [editing.id]: args.categoryDraft,
                    },
                    categoryEditId: null,
                  }),
              }}
              secondary={{
                label: 'Cancel',
                onSelect: () => updateArgs({ categoryEditId: null }),
              }}
            >
              <DialogBody>
                <Select
                  label="Categories"
                  placeholder="Pick categories"
                  multiple
                  searchable
                  options={categoryOptions}
                  value={args.categoryDraft}
                  onValueChange={(v) =>
                    updateArgs({ categoryDraft: Array.isArray(v) ? v : [v] })
                  }
                />
              </DialogBody>
            </DialogContent>
          )}
        </Dialog>

        <ConfirmDialog
          open={pendingDelete.length > 0}
          onOpenChange={(open) => !open && updateArgs({ confirmDeleteIds: [] })}
          tone="danger"
          title={`Delete ${plural(pendingDelete.length, 'transaction')}?`}
          description="They leave your accounts, balances and reports."
          impact={pendingDelete
            .slice(0, 3)
            .map((t) => `${t.description} · ₹${formatAmount(t)}`)}
          confirmLabel={`Delete ${pendingDelete.length}`}
          onConfirm={confirmDelete}
          onCancel={() => updateArgs({ confirmDeleteIds: [] })}
        />

        <Toaster />
      </div>
    );
  },
};

export const Default: Story = {
  args: {
    description: 'BigBasket',
    amount: '3,600.00',
    balance: '₹61,757',
    account: 'HDFC Bank Savings',
    provenance: 'Statement',
    categories: ['Groceries'],
  },
};

export const Credit: Story = {
  args: {
    description: 'Salary · Bolt Technologies',
    amount: '+2,15,000.00',
    balance: '₹5,61,400',
    account: 'HDFC Bank Savings',
    provenance: 'Statement',
    categories: ['Salary'],
    isCredit: true,
  },
};

export const ReviewDuplicate: Story = {
  args: {
    description: 'Swiggy Bangalore',
    amount: '1,249.00',
    balance: '₹44,319',
    account: 'HDFC Regalia',
    plastic: '••7741',
    reviewStatus: 'Duplicate',
    provenance: 'Gmail',
    categories: ['Food & dining', 'Delivery'],
  },
};

export const TransferLink: Story = {
  args: {
    description: 'Card bill payment',
    amount: '44,319.00',
    account: 'HDFC Bank Savings',
    link: { label: 'Transfer out' },
    categories: ['Bills'],
  },
};

export const MonitoredUnset: Story = {
  args: {
    description: 'Truffles St Marks Road',
    amount: '1,860.00',
    account: 'Amex Platinum',
    plastic: '••1008',
    reviewStatus: 'Watching',
    provenance: 'Manual',
    categories: [],
    unsetCategoryLabel: 'Set category',
    tone: 'warning',
  },
};

export const SelectedSelectionMode: Story = {
  args: {
    description: 'Uber India',
    amount: '640.00',
    account: 'Amex Platinum',
    plastic: '••1008',
    link: { label: 'EMI #8 · HDFC car loan', isRecord: true },
    categories: ['Transport'],
    selectable: true,
    selected: true,
    selectionMode: true,
    onSelectedChange: fn(),
  },
  render: function SelectedSelectionModeStory(args) {
    const [{ selected = true }, updateArgs] = useArgs();
    return (
      <TransactionRow
        {...args}
        selected={selected}
        selectionMode={selected}
        onSelectedChange={(s) => {
          args.onSelectedChange?.(s);
          updateArgs({ selected: s, selectionMode: s });
        }}
      />
    );
  },
};

export const Excluded: Story = {
  args: {
    description: 'Transfer to self',
    amount: '10,000.00',
    account: 'HDFC Bank Savings',
    provenance: 'Excluded',
    categories: ['Transfers'],
    disabled: true,
  },
};

export const WithLeadingAvatar: Story = {
  args: {
    description: 'HDFC Home Loan EMI',
    amount: '48,250.00',
    account: 'HDFC Bank Savings',
    categories: ['Housing'],
    chevron: true,
    leading: <Avatar variant="square" tone="inverse" initials="HD" size="md" />,
  },
};

export const SelectableInteractive: Story = {
  args: {
    description: 'Swiggy Bangalore',
    amount: '1,249.00',
    balance: '₹44,319',
    account: 'HDFC Regalia',
    plastic: '••7741',
    selectable: true,
    selected: false,
    categories: ['Food & dining'],
    onSelectedChange: fn(),
  },
  render: function SelectableRowStory(args) {
    const [{ selected = false }, updateArgs] = useArgs();
    return (
      <TransactionRow
        {...args}
        selected={selected}
        selectionMode={selected}
        onSelectedChange={(s) => {
          args.onSelectedChange?.(s);
          updateArgs({ selected: s, selectionMode: s });
        }}
      />
    );
  },
};

const sampleTransaction: TransactionRowData = {
  id: 'tx-1',
  date: '15 Oct',
  description: 'Apple Store Regent Street',
  category: 'Electronics',
  account: 'HDFC Regalia',
  plastic: '••7741',
  amount: 119900,
  formattedAmount: '₹1,19,900.00',
  balance: '₹42,100',
  reviewStatus: 'Watching',
};

const sampleTransactions: TransactionRowData[] = [
  sampleTransaction,
  {
    id: 'tx-2',
    date: '14 Oct',
    description: 'Starbucks Coffee',
    category: 'Food & dining',
    account: 'HDFC Bank Savings',
    amount: 750,
    formattedAmount: '₹750.00',
    balance: '₹1,62,000',
  },
  {
    id: 'tx-3',
    date: '14 Oct',
    description: 'Salary Credit - Acuity Systems',
    category: 'Income',
    account: 'HDFC Bank Savings',
    amount: 215000,
    formattedAmount: '+₹2,15,000.00',
    isCredit: true,
    balance: '₹1,62,750',
    provenance: 'Statement',
  },
  {
    id: 'tx-4',
    date: '12 Oct',
    description: 'Zara Clothing Mall of India',
    category: 'Shopping',
    account: 'HDFC Regalia',
    plastic: '••7741',
    amount: 4990,
    formattedAmount: '₹4,990.00',
    balance: '₹1,61,990',
    note: 'Winter jacket',
  },
];

export const Desktop: StoryObj = {
  parameters: { frame: 'page' },
  decorators: [
    (Story) => (
      <Card className="w-full max-w-5xl p-0 overflow-hidden">
        <Story />
      </Card>
    ),
  ],
  render: () => (
    <DataTable
      columns={transactionColumns}
      data={[sampleTransaction]}
      getRowId={(r) => r.id}
      renderRow={(row, rowProps) => (
        <TransactionRow
          key={row.id}
          date={row.date}
          description={row.description}
          amount={row.formattedAmount ?? String(row.amount)}
          balance={row.balance}
          account={row.account}
          plastic={row.plastic}
          reviewStatus={row.reviewStatus}
          categories={row.category ? [row.category] : undefined}
          isCredit={row.isCredit}
          selectable={rowProps.selectable}
          selected={rowProps.selected}
          onSelectedChange={rowProps.onSelectedChange}
        />
      )}
    />
  ),
};

export const InDataTable: StoryObj = {
  parameters: { frame: 'page' },
  decorators: [
    (Story) => (
      <Card className="w-full max-w-5xl p-0 overflow-hidden">
        <Story />
      </Card>
    ),
  ],
  render: function InDataTableStory() {
    const [{ selection = [], sort }, updateArgs] = useArgs();
    return (
      <DataTable
        columns={transactionColumns}
        data={sampleTransactions}
        getRowId={(r) => r.id}
        selectable
        selection={selection}
        onSelectionChange={(s) => updateArgs({ selection: s })}
        sort={sort}
        onSortChange={(s) => updateArgs({ sort: s })}
        renderRow={(row, rowProps) => (
          <TransactionRow
            key={row.id}
            date={row.date}
            description={row.description}
            amount={row.formattedAmount ?? String(row.amount)}
            balance={row.balance}
            account={row.account}
            plastic={row.plastic}
            reviewStatus={row.reviewStatus}
            note={row.note}
            provenance={row.provenance}
            categories={row.category ? [row.category] : undefined}
            isCredit={row.isCredit}
            selectable={rowProps.selectable}
            selected={rowProps.selected}
            onSelectedChange={rowProps.onSelectedChange}
            selectionMode={rowProps.selectionMode}
            onDetail={rowProps.onSelect}
          />
        )}
      />
    );
  },
};

export const InDataTableSwipe: StoryObj = {
  parameters: { frame: 'page' },
  decorators: [
    (Story) => (
      <Card className="w-full max-w-5xl p-0 overflow-hidden">
        <Story />
      </Card>
    ),
  ],
  render: function InDataTableSwipeStory() {
    const [{ selection = [] }, updateArgs] = useArgs();
    return (
      <DataTable
        columns={transactionColumns}
        data={sampleTransactions}
        getRowId={(r) => r.id}
        selectable
        selection={selection}
        onSelectionChange={(s) => updateArgs({ selection: s })}
        onRowSelect={fn()}
        wrapRow={(row, node) => (
          <SwipeActions
            key={row.id}
            left={{
              label: 'Approve',
              tone: 'brand',
              onTrigger: fn(),
            }}
            right={{
              label: 'Exclude',
              tone: 'danger',
              onTrigger: fn(),
            }}
          >
            {node}
          </SwipeActions>
        )}
        renderRow={(row, rowProps) => (
          <TransactionRow
            key={row.id}
            date={row.date}
            description={row.description}
            amount={row.formattedAmount ?? String(row.amount)}
            balance={row.balance}
            account={row.account}
            plastic={row.plastic}
            categories={row.category ? [row.category] : undefined}
            isCredit={row.isCredit}
            selectable={rowProps.selectable}
            selected={rowProps.selected}
            onSelectedChange={rowProps.onSelectedChange}
            selectionMode={rowProps.selectionMode}
            onDetail={rowProps.onSelect}
          />
        )}
      />
    );
  },
};

import type { Meta, StoryObj } from '@storybook/react';
import type { RowData } from '@tanstack/react-table';
import React from 'react';
import { useArgs } from 'storybook/preview-api';
import { fn } from 'storybook/test';

import {
  Badge,
  Button,
  Card,
  createDataTableColumnHelper,
  DataTable,
  type DataTableProps,
  Dialog,
  DialogBody,
  DialogContent,
  EmptyState,
  Pager,
  Text,
} from '@/components/ds';

interface Holding {
  id: string;
  name: string;
  ticker: string;
  qty: number;
  avgCost: string;
  currentPrice: string;
  pnl: string;
  pnlPositive: boolean;
}

const holdingsData: Holding[] = [
  {
    id: '1',
    name: 'Reliance Industries Ltd',
    ticker: 'RELIANCE · EQ',
    qty: 50,
    avgCost: '₹2,420.50',
    currentPrice: '₹2,850.00',
    pnl: '+₹21,475.00 (+17.7%)',
    pnlPositive: true,
  },
  {
    id: '2',
    name: 'HDFC Bank Ltd',
    ticker: 'HDFCBANK · EQ',
    qty: 120,
    avgCost: '₹1,560.00',
    currentPrice: '₹1,685.20',
    pnl: '+₹15,024.00 (+8.0%)',
    pnlPositive: true,
  },
  {
    id: '3',
    name: 'Tata Consultancy Services',
    ticker: 'TCS · EQ',
    qty: 35,
    avgCost: '₹3,890.00',
    currentPrice: '₹3,710.00',
    pnl: '-₹6,300.00 (-4.6%)',
    pnlPositive: false,
  },
  {
    id: '4',
    name: 'Infosys Ltd',
    ticker: 'INFY · EQ',
    qty: 80,
    avgCost: '₹1,410.25',
    currentPrice: '₹1,520.40',
    pnl: '+₹8,812.00 (+7.8%)',
    pnlPositive: true,
  },
  {
    id: '5',
    name: 'ICICI Bank Ltd',
    ticker: 'ICICIBANK · EQ',
    qty: 90,
    avgCost: '₹980.00',
    currentPrice: '₹1,112.50',
    pnl: '+₹11,925.00 (+13.5%)',
    pnlPositive: true,
  },
];

const ch = createDataTableColumnHelper<Holding>();

const holdingsColumns = ch.columns([
  ch.accessor('name', {
    id: 'name',
    header: 'Holding',
    meta: { size: 'fill', wrap: true, phone: 'main' },
    cell: ({ row }) => (
      <div>
        <Text variant="body-strong">{row.original.name}</Text>
        <Text variant="caption" tone="ink-3">
          {row.original.ticker}
        </Text>
      </div>
    ),
  }),
  ch.accessor('qty', {
    id: 'qty',
    header: 'Qty',
    meta: { size: 'sm', align: 'end', phone: 'hidden', sortable: true },
    cell: ({ getValue }) => getValue(),
  }),
  ch.accessor('avgCost', {
    id: 'avgCost',
    header: 'Avg cost',
    meta: { size: 'sm', align: 'end', phone: 'hidden', sortable: true },
    cell: ({ getValue }) => getValue(),
  }),
  ch.accessor('currentPrice', {
    id: 'currentPrice',
    header: 'Current',
    meta: { size: 'sm', align: 'end', phone: 'amount', sortable: true },
    cell: ({ getValue }) => getValue(),
  }),
  ch.accessor('pnl', {
    id: 'pnl',
    header: 'P&L',
    meta: { size: 'md', align: 'end', phone: 'status', sortable: true },
    cell: ({ row }) => (
      <Text
        variant="body-strong"
        tone={row.original.pnlPositive ? 'positive' : 'danger'}
      >
        {row.original.pnl}
      </Text>
    ),
  }),
]);

const meta = {
  title: 'DS/Data display/DataTable',
  component: DataTable,
  parameters: {
    layout: 'padded',
  },
  decorators: [
    (Story, context) => {
      if (context.story === 'InDialog') {
        return <Story />;
      }
      return (
        <Card className="max-w-5xl">
          <Story />
        </Card>
      );
    },
  ],
  args: {
    columns: holdingsColumns,
    data: holdingsData,
    getRowId: (row: Holding) => row.id,
    onSortChange: fn(),
    onSelectionChange: fn(),
    onAllSelectedChange: fn(),
    onExpandedChange: fn(),
  },
} satisfies Meta<DataTableProps<Holding>>;

export default meta;
type Story = StoryObj<DataTableProps<Holding>>;

/**
 * Storybook hooks (`useArgs`) only work in the story's own render function, never in a
 * child component, so each story's render is built here rather than rendering a wrapper.
 */
function interactiveRender<Row extends RowData = Holding>(
  extra: Partial<DataTableProps<Row>> = {},
) {
  return function Render(args: DataTableProps<Row>) {
    const props = { ...args, ...extra } as DataTableProps<Row> & {
      page?: number;
      size?: number;
    };
    const [
      {
        page = 0,
        size = 25,
        sort,
        selection = [],
        allSelected = false,
        expanded = [],
      },
      updateArgs,
    ] = useArgs();

    const pager =
      props.pager !== null ? (
        <Pager
          page={page}
          size={size}
          totalElements={100}
          onPageChange={(p) => updateArgs({ page: p })}
          onSizeChange={(s) => updateArgs({ size: s, page: 0 })}
        />
      ) : undefined;

    return (
      <DataTable<Row>
        {...props}
        sort={sort}
        onSortChange={(s) => {
          props.onSortChange?.(s);
          updateArgs({ sort: s });
        }}
        selection={selection}
        onSelectionChange={(sel) => {
          props.onSelectionChange?.(sel);
          updateArgs({ selection: sel });
        }}
        allSelected={allSelected}
        onAllSelectedChange={(all) => {
          props.onAllSelectedChange?.(all);
          updateArgs({ allSelected: all });
        }}
        expanded={expanded}
        onExpandedChange={(exp) => {
          props.onExpandedChange?.(exp);
          updateArgs({ expanded: exp });
        }}
        pager={pager}
      />
    );
  };
}

export const Plain: Story = {
  render: interactiveRender(),
};

export const Selectable: Story = {
  render: interactiveRender({ selectable: true }),
};

export const SelectAllAcrossPages: Story = {
  args: {
    selectable: true,
    allSelected: true,
    selection: ['1', '2', '3', '4', '5'],
  },
  render: interactiveRender(),
};

export const ServerSorted: Story = {
  args: {
    sortMode: 'server',
    sort: { id: 'currentPrice', desc: false },
  },
  render: interactiveRender(),
};

interface StatementLine {
  id: string;
  date: string;
  description: string;
  amount: number;
  formattedAmount: string;
}

const statementData: StatementLine[] = [
  { id: '1', date: '2026-10-12', description: 'Swiggy', amount: 480, formattedAmount: '₹480.00' },
  { id: '2', date: '2026-10-14', description: 'Salary Credit', amount: 125000, formattedAmount: '₹1,25,000.00' },
  { id: '3', date: '2026-10-09', description: 'Electricity Bill', amount: 2450, formattedAmount: '₹2,450.00' },
  { id: '4', date: '2026-10-15', description: 'Uber Rides', amount: 340, formattedAmount: '₹340.00' },
];

const stmtHelper = createDataTableColumnHelper<StatementLine>();
const statementColumns = stmtHelper.columns([
  stmtHelper.accessor('date', {
    id: 'date',
    header: 'Date',
    meta: { size: 'sm', sortable: true },
  }),
  stmtHelper.accessor('description', {
    id: 'description',
    header: 'Description',
    meta: { size: 'fill', sortable: true },
  }),
  stmtHelper.accessor('amount', {
    id: 'amount',
    header: 'Amount',
    meta: { size: 'sm', align: 'end', sortable: true },
    cell: ({ row }) => row.original.formattedAmount,
  }),
]);

export const ClientSorted: StoryObj<DataTableProps<StatementLine>> = {
  args: {
    columns: statementColumns,
    data: statementData,
    getRowId: (r) => r.id,
    sortMode: 'client',
  },
  render: interactiveRender<StatementLine>({ pager: null }),
};

interface TransactionWithBands {
  id: string;
  date: string;
  dayName: string;
  month: string;
  description: string;
  amount: string;
}

const bandsData: TransactionWithBands[] = [
  { id: '1', month: 'October 2026', date: '15 Oct', dayName: 'Thu', description: 'Apple Store', amount: '₹1,19,900.00' },
  { id: '2', month: 'October 2026', date: '15 Oct', dayName: 'Thu', description: 'Starbucks Coffee', amount: '₹750.00' },
  { id: '3', month: 'October 2026', date: '14 Oct', dayName: 'Wed', description: 'Zara Clothing', amount: '₹4,990.00' },
  { id: '4', month: 'September 2026', date: '29 Sep', dayName: 'Tue', description: 'Amazon India', amount: '₹2,140.00' },
];

const bandHelper = createDataTableColumnHelper<TransactionWithBands>();
const bandsColumns = bandHelper.columns([
  bandHelper.accessor('description', {
    id: 'description',
    header: 'Description',
    meta: { size: 'fill', phone: 'main' },
  }),
  bandHelper.accessor('amount', {
    id: 'amount',
    header: 'Amount',
    meta: { size: 'sm', align: 'end', phone: 'amount' },
  }),
]);

export const BandsAndDayHeaders: StoryObj<
  DataTableProps<TransactionWithBands>
> = {
  args: {
    columns: bandsColumns,
    data: bandsData,
    getRowId: (r) => r.id,
    band: (r) => ({ key: r.month, label: r.month }),
    dayHeader: (r) => ({ key: r.date, label: r.date, sublabel: r.dayName }),
  },
  render: interactiveRender(),
};

interface MultiLineRecord {
  id: string;
  customer: string;
  email: string;
  tags: string[];
  status: string;
  amount: string;
}

const multiLineData: MultiLineRecord[] = [
  {
    id: '1',
    customer: 'Acme Technologies Pvt Ltd',
    email: 'billing@acme.in · GSTIN: 27AADCB2212N1Z0',
    tags: ['Enterprise', 'Verified'],
    status: 'Active',
    amount: '₹3,45,000.00',
  },
  {
    id: '2',
    customer: 'Zeta Innovations LLP',
    email: 'accounts@zeta.io · GSTIN: 29AABCZ9981K1Z2',
    tags: ['SMB'],
    status: 'Review',
    amount: '₹84,200.00',
  },
];

const multiHelper = createDataTableColumnHelper<MultiLineRecord>();
const multiLineColumns = multiHelper.columns([
  multiHelper.accessor('customer', {
    id: 'customer',
    header: 'Organization',
    meta: { size: 'fill', wrap: true, phone: 'main' },
    cell: ({ row }) => (
      <div>
        <Text variant="body-strong">{row.original.customer}</Text>
        <Text variant="caption" tone="ink-3">
          {row.original.email}
        </Text>
      </div>
    ),
  }),
  multiHelper.accessor('tags', {
    id: 'tags',
    header: 'Labels',
    meta: { size: 'md', phone: 'status' },
    cell: ({ row }) => (
      <div className="flex gap-space-4 flex-wrap">
        {row.original.tags.map((t) => (
          <Badge key={t} variant="outline" shape="rounded">
            {t}
          </Badge>
        ))}
      </div>
    ),
  }),
  multiHelper.accessor('amount', {
    id: 'amount',
    header: 'Contract value',
    meta: { size: 'sm', align: 'end', phone: 'amount' },
  }),
]);

export const MultiLineAndChips: StoryObj<DataTableProps<MultiLineRecord>> = {
  args: {
    columns: multiLineColumns,
    data: multiLineData,
    getRowId: (r) => r.id,
  },
  render: interactiveRender(),
};

interface FnoPosition {
  id: string;
  contract: string;
  lotSize: number;
  entryPrice: string;
  currentPrice: string;
  pnl: string;
}

const fnoData: FnoPosition[] = [
  { id: '1', contract: 'NIFTY 24OCT 25000 CE', lotSize: 50, entryPrice: '₹142.50', currentPrice: '₹188.00', pnl: '+₹2,275.00' },
  { id: '2', contract: 'BANKNIFTY 24OCT 51500 PE', lotSize: 15, entryPrice: '₹310.00', currentPrice: '₹245.00', pnl: '-₹975.00' },
];

const fnoHelper = createDataTableColumnHelper<FnoPosition>();
const fnoColumns = fnoHelper.columns([
  fnoHelper.accessor('contract', {
    id: 'contract',
    header: 'Instrument',
    meta: { size: 'fill', phone: 'main' },
  }),
  fnoHelper.accessor('currentPrice', {
    id: 'currentPrice',
    header: 'LTP',
    meta: { size: 'sm', align: 'end', phone: 'amount' },
  }),
]);

export const PhoneSubAndActions: StoryObj<DataTableProps<FnoPosition>> = {
  args: {
    columns: fnoColumns,
    data: fnoData,
    getRowId: (r) => r.id,
    phoneSub: (r) => `${r.lotSize} qty · Entry ${r.entryPrice} · P&L ${r.pnl}`,
    phoneActions: () => (
      <Button variant="secondary" size="sm" onClick={fn()}>
        Close trade
      </Button>
    ),
  },
  render: interactiveRender(),
};

interface CategoryBreakdown {
  id: string;
  category: string;
  total: string;
  merchants: { name: string; amount: string }[];
}

const expandableData: CategoryBreakdown[] = [
  {
    id: 'food',
    category: 'Food & Dining',
    total: '₹18,450.00',
    merchants: [
      { name: 'Swiggy', amount: '₹8,200.00' },
      { name: 'Zomato', amount: '₹6,150.00' },
      { name: 'Subway', amount: '₹4,100.00' },
    ],
  },
  {
    id: 'travel',
    category: 'Travel & Commute',
    total: '₹12,800.00',
    merchants: [
      { name: 'Uber Rides', amount: '₹7,400.00' },
      { name: 'MakeMyTrip Flights', amount: '₹5,400.00' },
    ],
  },
];

const expandHelper = createDataTableColumnHelper<CategoryBreakdown>();
const expandColumns = expandHelper.columns([
  expandHelper.accessor('category', {
    id: 'category',
    header: 'Category',
    meta: { size: 'fill', phone: 'main' },
  }),
  expandHelper.accessor('total', {
    id: 'total',
    header: 'Total spend',
    meta: { size: 'sm', align: 'end', phone: 'amount' },
  }),
]);

export const Expandable: StoryObj<DataTableProps<CategoryBreakdown>> = {
  args: {
    columns: expandColumns,
    data: expandableData,
    getRowId: (r) => r.id,
    renderExpanded: (r) => (
      <div className="px-space-14 py-space-10 flex flex-col gap-space-8">
        <Text variant="overline" tone="ink-3">
          Top Merchants
        </Text>
        {r.merchants.map((m) => (
          <div key={m.name} className="flex justify-between">
            <Text variant="body">{m.name}</Text>
            <Text variant="body-strong">{m.amount}</Text>
          </div>
        ))}
      </div>
    ),
  },
  render: interactiveRender(),
};

export const RowStates: Story = {
  args: {
    highlightedRowId: '1',
    rowState: (r: Holding) => {
      if (r.id === '2') return { tone: 'warning' };
      if (r.id === '3') return { disabled: true };
      if (r.id === '4') return { muted: true };
      return undefined;
    },
  },
  render: interactiveRender(),
};

export const WithFooter: Story = {
  args: {
    footer: (
      <div className="px-space-14 py-space-10 flex items-center justify-between">
        <Text variant="body-strong">Total net ₹3,605 · TDS ₹370</Text>
        <Button variant="secondary" size="sm" onClick={fn()}>
          Export CSV
        </Button>
      </div>
    ),
  },
  render: interactiveRender(),
};

export const Loading: Story = {
  args: {
    loading: true,
    skeletonRows: 5,
  },
  render: interactiveRender(),
};

export const Busy: Story = {
  args: {
    busy: true,
  },
  render: interactiveRender(),
};

export const Empty: Story = {
  args: {
    data: [],
    empty: (
      <EmptyState
        title="No holdings found"
        description="Connect a demat account to view your stock and mutual fund investments."
      />
    ),
  },
  render: interactiveRender(),
};

export const InDialog: Story = {
  render: function Render(args) {
    return (
      <Dialog defaultOpen>
        <DialogContent size="lg" title="View underlying data">
          <DialogBody className="p-0 max-h-space-96 overflow-y-auto">
            <DataTable<Holding>
              columns={args.columns}
              data={args.data}
              getRowId={args.getRowId}
              stickyHeader
            />
          </DialogBody>
        </DialogContent>
      </Dialog>
    );
  },
};

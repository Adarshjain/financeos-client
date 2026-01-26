import { TransactionFormWrapper } from '@/components/transactions/TransactionFormWrapper';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { accountsApi, categoriesApi, transactionsApi } from '@/lib/apiClient';
import { Transaction } from '@/lib/transaction.types';
import { cn, formatDate, formatMoney } from '@/lib/utils';

export default async function TransactionsPage() {
  const [transactionsData, accounts, categories] = await Promise.all([
    transactionsApi.list(),
    accountsApi.list(),
    categoriesApi.list(),
  ]);

  // const transactions: Transaction[] = transactionsData.content;
  const transactions: Transaction[] = [
    {
      'id': 'txn_001',
      'createdAt': '2026-01-01T08:30:00.000Z',
      'accountId': '79d7d572-bf9e-4806-9086-fb44c6c51875',
      'date': '2026-01-01',
      'amount': -220.50,
      'balance': 49779.50,
      'description': 'Breakfast at local cafe',
      'categories': ['Food', 'Eating Out'],
      'source': 'gmail',
      'notes': 'Spent for so and so guy, will split it',
    },
    {
      'id': 'txn_002',
      'createdAt': '2026-01-01T11:15:00.000Z',
      'accountId': '79d7d572-bf9e-4806-9086-fb44c6c51875',
      'date': '2026-01-01',
      'amount': -150.00,
      'balance': 49629.50,
      'description': 'Auto ride',
      'categories': ['Transport'],
      'source': 'gmail',
    },
    {
      'id': 'txn_003',
      'createdAt': '2026-01-02T09:45:00.000Z',
      'accountId': '79d7d572-bf9e-4806-9086-fb44c6c51875',
      'date': '2026-01-02',
      'amount': -1850.75,
      'balance': 47778.75,
      'description': 'Grocery shopping',
      'categories': ['Groceries', 'Household'],
      'source': 'gmail',
    },
    {
      'id': 'txn_004',
      'createdAt': '2026-01-02T18:10:00.000Z',
      'accountId': '79d7d572-bf9e-4806-9086-fb44c6c51875',
      'date': '2026-01-02',
      'amount': -999.00,
      'balance': 46779.75,
      'description': 'Netflix subscription',
      'categories': ['Entertainment', 'Subscriptions'],
      'source': 'gmail',
    },
    {
      'id': 'txn_005',
      'createdAt': '2026-01-03T08:20:00.000Z',
      'accountId': '79d7d572-bf9e-4806-9086-fb44c6c51875',
      'date': '2026-01-03',
      'amount': -65.25,
      'balance': 46714.50,
      'description': 'Tea and snacks',
      'categories': ['Food'],
      'source': 'gmail',
    },
    {
      'id': 'txn_006',
      'createdAt': '2026-01-03T13:40:00.000Z',
      'accountId': '79d7d572-bf9e-4806-9086-fb44c6c51875',
      'date': '2026-01-03',
      'amount': -420.00,
      'balance': 46294.50,
      'description': 'Lunch with colleagues',
      'categories': ['Food', 'Work'],
      'source': 'gmail',
    },
    {
      'id': 'txn_007',
      'createdAt': '2026-01-04T10:00:00.000Z',
      'accountId': '79d7d572-bf9e-4806-9086-fb44c6c51875',
      'date': '2026-01-04',
      'amount': 300.00,
      'balance': 46594.50,
      'description': 'Cashback received',
      'categories': ['Income', 'Cashback'],
      'source': 'gmail',
    },
    {
      'id': 'txn_008',
      'createdAt': '2026-01-04T19:25:00.000Z',
      'accountId': '79d7d572-bf9e-4806-9086-fb44c6c51875',
      'date': '2026-01-04',
      'amount': -1200.40,
      'balance': 45394.10,
      'description': 'Online shopping',
      'categories': ['Shopping', 'Personal'],
      'source': 'gmail',
    },
    {
      'id': 'txn_009',
      'createdAt': '2026-01-05T09:10:00.000Z',
      'accountId': '79d7d572-bf9e-4806-9086-fb44c6c51875',
      'date': '2026-01-05',
      'amount': -90.00,
      'balance': 45304.10,
      'description': 'Morning coffee',
      'categories': ['Food'],
      'source': 'gmail',
    },
    {
      'id': 'txn_010',
      'createdAt': '2026-01-05T21:00:00.000Z',
      'accountId': '79d7d572-bf9e-4806-9086-fb44c6c51875',
      'date': '2026-01-05',
      'amount': -650.00,
      'balance': 44654.10,
      'description': 'Petrol refill',
      'categories': ['Transport', 'Fuel'],
      'source': 'gmail',
    },

    {
      'id': 'txn_011',
      'createdAt': '2026-01-06T10:30:00.000Z',
      'accountId': '79d7d572-bf9e-4806-9086-fb44c6c51875',
      'date': '2026-01-06',
      'amount': -350.00,
      'balance': 44304.10,
      'description': 'Mobile recharge',
      'categories': ['Utilities', 'Mobile'],
      'source': 'gmail',
    },
    {
      'id': 'txn_012',
      'createdAt': '2026-01-06T20:15:00.000Z',
      'accountId': '79d7d572-bf9e-4806-9086-fb44c6c51875',
      'date': '2026-01-06',
      'amount': -180.00,
      'balance': 44124.10,
      'description': 'Street food',
      'categories': ['Food', 'Snacks'],
      'source': 'gmail',
    },
    {
      'id': 'txn_013',
      'createdAt': '2026-01-07T09:00:00.000Z',
      'accountId': '79d7d572-bf9e-4806-9086-fb44c6c51875',
      'date': '2026-01-07',
      'amount': -2400.00,
      'balance': 41724.10,
      'description': 'Electricity bill',
      'categories': ['Utilities', 'Bills'],
      'source': 'gmail',
    },
    {
      'id': 'txn_014',
      'createdAt': '2026-01-07T18:45:00.000Z',
      'accountId': '79d7d572-bf9e-4806-9086-fb44c6c51875',
      'date': '2026-01-07',
      'amount': -500.50,
      'balance': 41223.60,
      'description': 'Dinner order',
      'categories': ['Food', 'Delivery'],
      'source': 'gmail',
    },
    {
      'id': 'txn_015',
      'createdAt': '2026-01-08T12:10:00.000Z',
      'accountId': '79d7d572-bf9e-4806-9086-fb44c6c51875',
      'date': '2026-01-08',
      'amount': 1200.00,
      'balance': 42423.60,
      'description': 'Refund from Amazon',
      'categories': ['Refund', 'Shopping'],
      'source': 'gmail',
    },

    {
      'id': 'txn_016',
      'createdAt': '2026-01-09T09:20:00.000Z',
      'accountId': '79d7d572-bf9e-4806-9086-fb44c6c51875',
      'date': '2026-01-09',
      'amount': -75.00,
      'balance': 42348.60,
      'description': 'Tea',
      'categories': ['Food'],
      'source': 'gmail',
    },
    {
      'id': 'txn_017',
      'createdAt': '2026-01-09T19:30:00.000Z',
      'accountId': '79d7d572-bf9e-4806-9086-fb44c6c51875',
      'date': '2026-01-09',
      'amount': -900.00,
      'balance': 41448.60,
      'description': 'Movie tickets',
      'categories': ['Entertainment', 'Leisure'],
      'source': 'gmail',
    },
    {
      'id': 'txn_018',
      'createdAt': '2026-01-10T11:00:00.000Z',
      'accountId': '79d7d572-bf9e-4806-9086-fb44c6c51875',
      'date': '2026-01-10',
      'amount': -300.00,
      'balance': 41148.60,
      'description': 'Internet bill',
      'categories': ['Utilities', 'Internet'],
      'source': 'gmail',
    },
    {
      'id': 'txn_019',
      'createdAt': '2026-01-11T10:40:00.000Z',
      'accountId': '79d7d572-bf9e-4806-9086-fb44c6c51875',
      'date': '2026-01-11',
      'amount': -1600.00,
      'balance': 39548.60,
      'description': 'Clothing purchase',
      'categories': ['Shopping', 'Clothing'],
      'source': 'gmail',
    },
    {
      'id': 'txn_020',
      'createdAt': '2026-01-11T18:00:00.000Z',
      'accountId': '79d7d572-bf9e-4806-9086-fb44c6c51875',
      'date': '2026-01-11',
      'amount': -250.00,
      'balance': 39298.60,
      'description': 'Evening snacks',
      'categories': ['Food'],
      'source': 'gmail',
    },

    {
      'id': 'txn_021',
      'createdAt': '2026-01-12T09:00:00.000Z',
      'accountId': '79d7d572-bf9e-4806-9086-fb44c6c51875',
      'date': '2026-01-12',
      'amount': -3000.00,
      'balance': 36298.60,
      'description': 'Rent payment',
      'categories': ['Housing', 'Rent'],
      'source': 'gmail',
    },
    {
      'id': 'txn_022',
      'createdAt': '2026-01-13T14:20:00.000Z',
      'accountId': '79d7d572-bf9e-4806-9086-fb44c6c51875',
      'date': '2026-01-13',
      'amount': 500.00,
      'balance': 36798.60,
      'description': 'Friend paid back',
      'categories': ['Income'],
      'source': 'gmail',
    },
    {
      'id': 'txn_023',
      'createdAt': '2026-01-13T20:45:00.000Z',
      'accountId': '79d7d572-bf9e-4806-9086-fb44c6c51875',
      'date': '2026-01-13',
      'amount': -780.00,
      'balance': 36018.60,
      'description': 'Zomato order',
      'categories': ['Food', 'Delivery'],
      'source': 'gmail',
    },
    {
      'id': 'txn_024',
      'createdAt': '2026-01-14T10:00:00.000Z',
      'accountId': '79d7d572-bf9e-4806-9086-fb44c6c51875',
      'date': '2026-01-14',
      'amount': -120.00,
      'balance': 35898.60,
      'description': 'Bus ticket',
      'categories': ['Transport'],
      'source': 'gmail',
    },
    {
      'id': 'txn_025',
      'createdAt': '2026-01-15T18:30:00.000Z',
      'accountId': '79d7d572-bf9e-4806-9086-fb44c6c51875',
      'date': '2026-01-15',
      'amount': -950.00,
      'balance': 34948.60,
      'description': 'Dinner outing',
      'categories': ['Food', 'Social'],
      'source': 'gmail',
    },

    {
      'id': 'txn_026',
      'createdAt': '2026-01-16T09:00:00.000Z',
      'accountId': '79d7d572-bf9e-4806-9086-fb44c6c51875',
      'date': '2026-01-16',
      'amount': -200.00,
      'balance': 34748.60,
      'description': 'Milk and bread',
      'categories': ['Groceries', 'Food'],
      'source': 'gmail',
    },
  ];

  const getAccountName = (accountId: string | undefined) => {
    if (!accountId) return '—';
    const account = accounts.find((a) => a.id === accountId);
    return account?.name || 'Unknown';
  };

  const TransactionCard = ({ transaction }: { transaction: Transaction; }) => {
    return <>
      <div className="flex-1 py-2 flex items-start justify-between border-2 rounded-md relative mb-2 px-2">
        <div className="flex flex-col gap-1 text-sm">
          <div className="break-all font-medium">{transaction.description}</div>
          <div className="min-w-max">{getAccountName(transaction.accountId) ?? 'No Match'}</div>
          <div>{transaction.categories?.map(
            category => <Badge variant="outline" className="mr-1 rounded px-1" key={category}>{category}</Badge>,
          )}</div>
          <div>{transaction.notes}</div>
        </div>
        <div>
          <div
            className={cn(
              'font-bold text-lg whitespace-nowrap text-right min-w-[100px]',
              transaction.amount >= 0 ? 'text-emerald-500' : 'text-rose-500',
            )}>{formatMoney(Math.abs(transaction.amount))}</div>
          <div className="text-right text-sm mt-1 mr-0.5">{formatMoney(transaction.balance)}</div>
        </div>
      </div>
    </>;
  };

  return (
    <div className="space-y-3">
      <div className="flex justify-between px-4 mt-4">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Transactions</h1>
        <TransactionFormWrapper categories={categories} accounts={accounts} trigger={<Button>Create</Button>} />
      </div>

      <div className="px-2">
        {transactions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-slate-600 dark:text-slate-400 mb-2">
              No transactions yet
            </p>
            <p className="text-sm text-slate-500">
              Add your first transaction to start tracking!
            </p>
          </div>
        ) : (
          transactions.map((transaction, index) => {
            const showDate = index === 0 || transaction.date !== transactions[index - 1].date;
            return (<>
              {showDate && <div
                className="text-lg font-medium pl-2 pb-1 pt-2 sticky top-0 bg-slate-50 z-10"
              >{formatDate(transaction.date)}</div>}
                <TransactionFormWrapper
                  key={transaction.id}
                  categories={categories}
                  accounts={accounts}
                  transaction={transaction}
                  trigger={<TransactionCard transaction={transaction} />}
                />
              </>
            );
          })
        )}
      </div>
    </div>
  );
}

'use client';

import { Card, CardContent } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Account, Broker } from '@/lib/account.types';
import { InvestmentTransactionResponse } from '@/lib/types';
import { cn, formatDate, formatMoney } from '@/lib/utils';

import { EditTransactionDialog } from '../EditTransactionDialog';
import {
  getBrokerName,
  getInstrumentDisplayName,
  getSettlementBadge,
  getTypeBadge,
} from './TradebookMobileCards';

interface TradebookTableProps {
  transactions: InvestmentTransactionResponse[];
  brokerAccounts: Broker[];
  accounts: Account[];
  isLoading: boolean;
  onSuccess: () => void;
}

export function TradebookTable({
  transactions,
  brokerAccounts,
  accounts,
  isLoading,
  onSuccess,
}: TradebookTableProps) {
  return (
    <Card
      className={cn(
        'hidden md:block bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-sm rounded-xl overflow-hidden',
        isLoading && 'opacity-60 transition-opacity'
      )}
    >
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent border-slate-100 dark:border-slate-800">
                <TableHead className="text-xs font-medium whitespace-nowrap">
                  Trade Date
                </TableHead>
                <TableHead className="text-xs font-medium">
                  Instrument
                </TableHead>
                <TableHead className="text-xs font-medium">Broker</TableHead>
                <TableHead className="text-xs font-medium whitespace-nowrap">
                  Type
                </TableHead>
                <TableHead className="text-xs font-medium whitespace-nowrap">
                  Settlement
                </TableHead>
                <TableHead className="text-right text-xs font-medium whitespace-nowrap">
                  Qty
                </TableHead>
                <TableHead className="text-right text-xs font-medium whitespace-nowrap">
                  Price/Unit
                </TableHead>
                <TableHead className="text-right text-xs font-medium whitespace-nowrap">
                  Total Value
                </TableHead>
                <TableHead className="text-right text-xs font-medium"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx) => {
                const totalValue =
                  Number(tx.quantity || 0) * Number(tx.price || 0);

                return (
                  <TableRow
                    key={tx.id}
                    className="border-slate-100 dark:border-slate-800/60"
                  >
                    <TableCell className="py-1.5 text-xs text-slate-600 dark:text-slate-400 tabular-nums font-medium whitespace-nowrap">
                      {formatDate(tx.tradeDate)}
                    </TableCell>
                    <TableCell className="py-1.5">
                      <div
                        className="font-medium text-xs text-slate-900 dark:text-slate-100"
                        title={getInstrumentDisplayName(tx)}
                      >
                        {getInstrumentDisplayName(tx)}
                      </div>
                    </TableCell>
                    <TableCell className="py-1.5 text-xs text-slate-600 dark:text-slate-400 font-medium">
                      {getBrokerName(tx, accounts, brokerAccounts)}
                    </TableCell>
                    <TableCell className="py-1.5 text-xs">
                      {getTypeBadge(tx.type)}
                    </TableCell>
                    <TableCell className="py-1.5 text-xs">
                      {getSettlementBadge(tx.settlementType)}
                    </TableCell>
                    <TableCell className="py-1.5 text-right font-medium text-xs text-slate-900 dark:text-slate-100 tabular-nums">
                      {tx.quantity}
                    </TableCell>
                    <TableCell className="py-1.5 text-right text-xs text-slate-700 dark:text-slate-300 tabular-nums font-medium">
                      {formatMoney(tx.price)}
                    </TableCell>
                    <TableCell className="py-1.5 text-right font-medium text-xs text-slate-900 dark:text-slate-100 tabular-nums">
                      {formatMoney(totalValue)}
                    </TableCell>
                    <TableCell className="py-1.5 text-right">
                      <EditTransactionDialog
                        transaction={tx}
                        brokerAccounts={brokerAccounts}
                        onSuccess={onSuccess}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}

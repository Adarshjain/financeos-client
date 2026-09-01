'use client';

import { ChevronRight } from 'lucide-react';

import { StatementVerdictBadge } from '@/components/statements/StatementBadges';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { StatementSummary } from '@/lib/statement.types';
import { formatDate, formatMoney } from '@/lib/utils';

interface StatementsDesktopTableProps {
  statements: StatementSummary[];
  onSelectStatement: (statementId: string) => void;
}

export function StatementsDesktopTable({
  statements,
  onSelectStatement,
}: StatementsDesktopTableProps) {
  return (
    <div className="hidden md:block border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Period</TableHead>
            <TableHead>Type</TableHead>
            <TableHead className="text-right">Opening</TableHead>
            <TableHead className="text-right">Closing</TableHead>
            <TableHead>Source</TableHead>
            <TableHead className="text-right">Txns</TableHead>
            <TableHead>Verdict</TableHead>
            <TableHead className="text-right">Action</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {statements.map((s) => (
            <TableRow key={s.id}>
              <TableCell className="font-medium whitespace-nowrap">
                {formatDate(s.periodStart)} – {formatDate(s.periodEnd)}
              </TableCell>
              <TableCell>
                <span className="text-xs uppercase bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-400">
                  {s.statementType === 'credit_card' ? 'Credit Card' : 'Bank Account'}
                </span>
              </TableCell>
              <TableCell className="text-right tabular-nums">
                {s.openingBalance !== null ? formatMoney(s.openingBalance) : '—'}
              </TableCell>
              <TableCell className="text-right tabular-nums font-semibold">
                {s.closingBalance !== null ? formatMoney(s.closingBalance) : '—'}
              </TableCell>
              <TableCell>
                <span className="text-xs uppercase bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-slate-600 dark:text-slate-400">
                  {s.source === 'file_upload' ? 'Upload' : s.source === 'gmail' ? 'Email' : s.source}
                </span>
              </TableCell>
              <TableCell className="text-right tabular-nums text-slate-600 dark:text-slate-400 text-xs">
                {s.transactionCount !== null && s.transactionCount !== undefined
                  ? s.transactionCount
                  : '—'}
              </TableCell>
              <TableCell>
                <StatementVerdictBadge verdict={s.verdict} />
              </TableCell>
              <TableCell className="text-right">
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => onSelectStatement(s.id)}
                >
                  <span>View details</span>
                  <ChevronRight className="w-3.5 h-3.5" />
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

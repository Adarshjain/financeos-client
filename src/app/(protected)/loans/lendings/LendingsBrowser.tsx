'use client';

import { ArrowDownLeft, ArrowUpRight, ChevronRight, Plus, Search, Users, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import { createLendingAction, fetchCounterpartiesAction } from '@/actions/lendings';
import { PageActionBar } from '@/components/layout/PageActionBarContext';
import { TablePagination } from '@/components/reports/views/TablePagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import type { Page } from '@/lib/pagination';
import type {
  CounterpartyResponse,
  LendingDirection,
  LoansSummaryResponse,
} from '@/lib/types';
import { formatMoney } from '@/lib/utils';

interface LendingsBrowserProps {
  initialCounterparties: Page<CounterpartyResponse>;
  summary: LoansSummaryResponse;
}

export function LendingsBrowser({
  initialCounterparties,
  summary,
}: LendingsBrowserProps) {
  const router = useRouter();

  const [counterpartiesPage, setCounterpartiesPage] =
    useState<Page<CounterpartyResponse>>(initialCounterparties);
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);

  // Form state
  const [selectedCpId, setSelectedCpId] = useState<string>('new');
  const [newCpName, setNewCpName] = useState('');
  const [direction, setDirection] = useState<LendingDirection>('lent');
  const [amount, setAmount] = useState('');
  const [lendDate, setLendDate] = useState(new Date().toISOString().split('T')[0]);
  const [expectedReturnDate, setExpectedReturnDate] = useState('');
  const [notes, setNotes] = useState('');
  const [txId, setTxId] = useState('');
  const [loading, setLoading] = useState(false);

  const handlePageChange = async (newPage: number) => {
    const res = await fetchCounterpartiesAction(newPage, counterpartiesPage.size);
    if (res.success) {
      setCounterpartiesPage(res.data);
    } else {
      toast.error(res.error.message);
    }
  };

  const handleCreateLending = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedCpId === 'new' && !newCpName.trim()) {
      toast.error('Person name is required');
      return;
    }
    if (!amount || Number(amount) <= 0) {
      toast.error('Amount must be greater than zero');
      return;
    }

    setLoading(true);
    try {
      const res = await createLendingAction({
        counterpartyId: selectedCpId !== 'new' ? selectedCpId : undefined,
        newCounterpartyName: selectedCpId === 'new' ? newCpName.trim() : undefined,
        direction,
        amount: Number(amount),
        lendDate,
        expectedReturnDate: expectedReturnDate || undefined,
        transactionId: txId.trim() || undefined,
        notes: notes.trim() || undefined,
      });

      if (res.success) {
        toast.success('Lending recorded successfully');
        setCreateOpen(false);
        const cpRes = await fetchCounterpartiesAction(0, counterpartiesPage.size);
        if (cpRes.success) setCounterpartiesPage(cpRes.data);
      } else {
        toast.error(res.error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredContent = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return counterpartiesPage.content;
    return counterpartiesPage.content.filter(
      (cp) => cp.name.toLowerCase().includes(q) || (cp.notes && cp.notes.toLowerCase().includes(q)),
    );
  }, [counterpartiesPage.content, search]);

  return (
    <div className="space-y-4">
      {/* Primary Header Action */}
      <PageActionBar>
        <Button onClick={() => setCreateOpen(true)} size="sm" className="h-8 text-xs gap-1.5">
          <Plus className="h-3.5 w-3.5" /> Add Lending
        </Button>
      </PageActionBar>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">
              Total Lent Out (Receivable)
            </p>
            <h2 className="text-xl sm:text-2xl font-bold mt-0.5 text-emerald-600 dark:text-emerald-400">
              {formatMoney(summary.lentOutstanding)}
            </h2>
          </div>
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 rounded-xl">
            <ArrowUpRight className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 uppercase tracking-wider">
              Total Borrowed (Payable)
            </p>
            <h2 className="text-xl sm:text-2xl font-bold mt-0.5 text-rose-600 dark:text-rose-400">
              {formatMoney(summary.borrowedOutstanding)}
            </h2>
          </div>
          <div className="p-2.5 bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 rounded-xl">
            <ArrowDownLeft className="h-5 w-5" />
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 p-4 rounded-xl flex items-center justify-between shadow-sm">
          <div>
            <p className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              Net P2P Position
            </p>
            <h2
              className={`text-xl sm:text-2xl font-bold mt-0.5 ${
                summary.netReceivable >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {summary.netReceivable >= 0 ? '+' : ''}
              {formatMoney(summary.netReceivable)}
            </h2>
          </div>
          <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl text-slate-500">
            <Users className="h-5 w-5" />
          </div>
        </div>
      </div>

      {/* Ledger Container (No Cards Inside Cards!) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        {/* Search Toolbar */}
        <div className="p-3.5 border-b border-slate-100 dark:border-slate-800">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search person or notes..."
              className="h-8 pl-8 pr-7 text-xs bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg w-full"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Mobile View: Flat List (No Cards Inside Cards!) */}
        <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {filteredContent.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No counterparties found.
            </div>
          ) : (
            filteredContent.map((cp) => (
              <div
                key={cp.id}
                onClick={() => router.push(`/loans/lendings/${cp.id}`)}
                className="p-4 space-y-2 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 cursor-pointer active:bg-slate-100 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="font-semibold text-sm text-slate-900 dark:text-slate-100">{cp.name}</div>
                    {cp.notes && (
                      <div className="text-xs text-slate-500 truncate max-w-xs">{cp.notes}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="text-[10px]">
                      {cp.openLendingCount} open
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-slate-400" />
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2 text-xs pt-1">
                  <div>
                    <span className="text-slate-500 block text-[10px]">Lent</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold">
                      {cp.lentOutstanding > 0 ? formatMoney(cp.lentOutstanding) : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Borrowed</span>
                    <span className="text-rose-600 dark:text-rose-400 font-semibold">
                      {cp.borrowedOutstanding > 0 ? formatMoney(cp.borrowedOutstanding) : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Net</span>
                    <span
                      className={`font-bold ${
                        cp.netPosition > 0
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : cp.netPosition < 0
                          ? 'text-rose-600 dark:text-rose-400'
                          : 'text-slate-500'
                      }`}
                    >
                      {cp.netPosition > 0 ? '+' : ''}
                      {formatMoney(cp.netPosition)}
                    </span>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Desktop View: Clean Table */}
        <div className="hidden md:block overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
                <th className="py-3 px-4">Person / Counterparty</th>
                <th className="py-3 px-4 text-right text-emerald-600 dark:text-emerald-400">
                  Lent (Receivable)
                </th>
                <th className="py-3 px-4 text-right text-rose-600 dark:text-rose-400">
                  Borrowed (Payable)
                </th>
                <th className="py-3 px-4 text-right">Net Position</th>
                <th className="py-3 px-4 text-center">Open Lendings</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredContent.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-slate-400">
                    No counterparties found.
                  </td>
                </tr>
              ) : (
                filteredContent.map((cp) => (
                  <tr
                    key={cp.id}
                    onClick={() => router.push(`/loans/lendings/${cp.id}`)}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
                  >
                    <td className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100">
                      {cp.name}
                      {cp.notes && (
                        <div className="text-[11px] font-normal text-slate-500 truncate max-w-xs">
                          {cp.notes}
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-right font-medium text-emerald-600 dark:text-emerald-400">
                      {cp.lentOutstanding > 0 ? formatMoney(cp.lentOutstanding) : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-medium text-rose-600 dark:text-rose-400">
                      {cp.borrowedOutstanding > 0 ? formatMoney(cp.borrowedOutstanding) : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right font-extrabold">
                      <span
                        className={
                          cp.netPosition > 0
                            ? 'text-emerald-600 dark:text-emerald-400'
                            : cp.netPosition < 0
                            ? 'text-rose-600 dark:text-rose-400'
                            : 'text-slate-500'
                        }
                      >
                        {cp.netPosition > 0 ? '+' : ''}
                        {formatMoney(cp.netPosition)}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-center">
                      <Badge variant="outline" className="text-[10px]">
                        {cp.openLendingCount} open
                      </Badge>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="p-3 border-t border-slate-100 dark:border-slate-800">
          <TablePagination
            page={counterpartiesPage}
            onPageChange={handlePageChange}
          />
        </div>
      </div>

      {/* Add Lending Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md w-[95vw] p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Add Person-to-Person Lending</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleCreateLending} className="space-y-3 pt-1 text-xs">
            <div className="space-y-1">
              <Label htmlFor="cpSelect" className="text-xs">Person / Counterparty *</Label>
              <Select
                value={selectedCpId}
                onValueChange={(v) => setSelectedCpId(v)}
              >
                <SelectTrigger id="cpSelect" className="h-9 text-xs">
                  <SelectValue placeholder="Select person" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="new" className="text-xs">+ Add New Person</SelectItem>
                  {counterpartiesPage.content.map((cp) => (
                    <SelectItem key={cp.id} value={cp.id} className="text-xs">
                      {cp.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedCpId === 'new' && (
              <div className="space-y-1">
                <Label htmlFor="cpName" className="text-xs">New Person Name *</Label>
                <Input
                  id="cpName"
                  placeholder="e.g. Rahul Sharma"
                  value={newCpName}
                  onChange={(e) => setNewCpName(e.target.value)}
                  required
                  className="h-9 text-xs"
                />
              </div>
            )}

            <div className="space-y-1">
              <Label className="text-xs">Direction *</Label>
              <div className="flex gap-4 pt-1">
                <label className="flex items-center gap-1.5 cursor-pointer font-medium text-emerald-600 dark:text-emerald-400 text-xs">
                  <input
                    type="radio"
                    name="lendingDir"
                    checked={direction === 'lent'}
                    onChange={() => setDirection('lent')}
                  />
                  <span>I Lent Money</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer font-medium text-rose-600 dark:text-rose-400 text-xs">
                  <input
                    type="radio"
                    name="lendingDir"
                    checked={direction === 'borrowed'}
                    onChange={() => setDirection('borrowed')}
                  />
                  <span>I Borrowed Money</span>
                </label>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label htmlFor="amount" className="text-xs">Amount (₹) *</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  placeholder="5000"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  required
                  className="h-9 text-xs"
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="lendDate" className="text-xs">Date *</Label>
                <Input
                  id="lendDate"
                  type="date"
                  value={lendDate}
                  onChange={(e) => setLendDate(e.target.value)}
                  required
                  className="h-9 text-xs"
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="expDate" className="text-xs">Expected Return Date (Optional)</Label>
              <Input
                id="expDate"
                type="date"
                value={expectedReturnDate}
                onChange={(e) => setExpectedReturnDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="notes" className="text-xs">Notes (Optional)</Label>
              <Textarea
                id="notes"
                rows={2}
                placeholder="e.g. Dinner split, trip cash advance..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="space-y-1">
              <Label htmlFor="txId" className="text-xs">Linked Transaction ID (Optional)</Label>
              <Input
                id="txId"
                placeholder="UUID of bank transaction"
                value={txId}
                onChange={(e) => setTxId(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <DialogFooter className="pt-2 flex flex-row gap-2 justify-end">
              <Button type="button" variant="outline" size="sm" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" size="sm" disabled={loading}>
                {loading ? 'Saving...' : 'Save Lending'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

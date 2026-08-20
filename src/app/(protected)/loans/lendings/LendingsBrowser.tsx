'use client';

import { ChevronRight, Plus, Search, Trash2, X } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

import {
  createLendingAction,
  deleteCounterpartyAction,
  fetchCounterpartiesAction,
} from '@/actions/lendings';
import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import { PageActionBar } from '@/components/layout/PageActionBarContext';
import { TablePagination } from '@/components/reports/views/TablePagination';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import {
  Dialog,
  DialogBody,
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
import { cn, formatMoney } from '@/lib/utils';

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
  const [entryDate, setEntryDate] = useState(new Date().toISOString().split('T')[0]);
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

  const handleDeleteCp = async (cp: CounterpartyResponse) => {
    const res = await deleteCounterpartyAction(cp.id);
    if (res.success) {
      toast.success(`Deleted ${cp.name}`);
      const cpRes = await fetchCounterpartiesAction(counterpartiesPage.number, counterpartiesPage.size);
      if (cpRes.success) setCounterpartiesPage(cpRes.data);
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
        entryDate,
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

  const renderActionBar = (isMobile = false) => (
    <div className={cn('flex items-center gap-2 w-full', isMobile ? 'flex-row text-xs' : 'flex-wrap')}>
      <div className="relative flex-1">
        <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search person or notes..."
          className="h-8 pl-8 pr-7 text-xs font-medium bg-slate-50 dark:bg-slate-950 border-slate-200 dark:border-slate-800 rounded-lg w-full"
        />
        {search && (
          <button
            type="button"
            aria-label="Clear search"
            onClick={() => setSearch('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/*<div className="flex items-center gap-2 w-full sm:w-auto shrink-0 sm:hidden">*/}
        <Button onClick={() => setCreateOpen(true)} size="sm" className="sm:hidden">
          <Plus className="h-3.5 w-3.5" /> Add Lending
        </Button>
      {/*</div>*/}
    </div>
  );

  return (
    <div className="pb-20 p-3 sm:p-6 space-y-3 max-w-7xl mx-auto w-full min-w-0 overflow-x-hidden">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-1">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white flex items-center gap-2">
            Lendings Ledger ({counterpartiesPage.totalElements})
          </h1>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Track person-to-person money lent out, borrowed, receivables, and payables
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <Button onClick={() => setCreateOpen(true)} size="sm">
            <Plus className="h-3.5 w-3.5" /> Add Lending
          </Button>
        </div>
      </div>

      {/* Action Bar / Search Filter Card */}
      <Card className="hidden lg:block bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm rounded-xl p-3">
        {renderActionBar(false)}
      </Card>

      <PageActionBar>
        {renderActionBar(true)}
      </PageActionBar>

      {/* Consolidated Summary Card */}
      <Card className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm rounded-xl p-3.5 sm:p-4">
        <CardContent className="p-0 grid grid-cols-2 sm:grid-cols-3 gap-3 sm:gap-4">
          <div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Lent Out
            </p>
            <p className="text-base sm:text-lg font-black text-emerald-600 dark:text-emerald-400 tabular-nums mt-0.5">
              {formatMoney(summary.lentOutstanding)}
            </p>
          </div>

          <div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Total Borrowed
            </p>
            <p className="text-base sm:text-lg font-black text-rose-600 dark:text-rose-400 tabular-nums mt-0.5">
              {formatMoney(summary.borrowedOutstanding)}
            </p>
          </div>

          <div>
            <p className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Net Position
            </p>
            <p
              className={`text-xl sm:text-lg font-black tabular-nums mt-0.5 ${
                summary.netReceivable >= 0
                  ? 'text-emerald-600 dark:text-emerald-400'
                  : 'text-rose-600 dark:text-rose-400'
              }`}
            >
              {summary.netReceivable >= 0 ? '+' : ''}
              {formatMoney(summary.netReceivable)}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Ledger Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        {/* Mobile View: Flat List */}
        <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800">
          {filteredContent.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No counterparties found.
            </div>
          ) : (
            filteredContent.map((cp) => (
              <div
                key={cp.id}
                className="p-4 space-y-2 hover:bg-slate-50/80 dark:hover:bg-slate-800/40 active:bg-slate-100 transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div
                    onClick={() => router.push(`/loans/lendings/${cp.id}`)}
                    className="cursor-pointer flex-1"
                  >
                    <div className="font-semibold text-sm text-slate-900 dark:text-slate-100">{cp.name}</div>
                    {cp.notes && (
                      <div className="text-xs text-slate-500 truncate max-w-xs">{cp.notes}</div>
                    )}
                  </div>
                  <div className="flex items-center gap-1">
                    <Badge variant="outline" className="text-[10px]">
                      {cp.entryCount} entries
                    </Badge>
                    <ConfirmationDialog
                      title="Delete Counterparty"
                      description={`Delete ${cp.name}? This permanently deletes their entire ledger history (${cp.entryCount} entries).`}
                      primaryAction={() => handleDeleteCp(cp)}
                      primaryActionText="Delete Person"
                      variant="destructive"
                      trigger={
                        <Button
                          variant="ghost"
                          size="icon-xs"
                          className="text-slate-400 hover:text-rose-600"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      }
                    />
                    <ChevronRight
                      className="h-4 w-4 text-slate-400 cursor-pointer"
                      onClick={() => router.push(`/loans/lendings/${cp.id}`)}
                    />
                  </div>
                </div>

                <div
                  onClick={() => router.push(`/loans/lendings/${cp.id}`)}
                  className="grid grid-cols-3 gap-2 text-xs pt-1 cursor-pointer"
                >
                  <div>
                    <span className="text-slate-500 block text-[10px]">Total Lent</span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-semibold tabular-nums">
                      {cp.totalLent > 0 ? formatMoney(cp.totalLent) : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Total Borrowed</span>
                    <span className="text-rose-600 dark:text-rose-400 font-semibold tabular-nums">
                      {cp.totalBorrowed > 0 ? formatMoney(cp.totalBorrowed) : '—'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">Net Position</span>
                    <span
                      className={`font-bold tabular-nums ${
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
                  Total Lent
                </th>
                <th className="py-3 px-4 text-right text-rose-600 dark:text-rose-400">
                  Total Borrowed
                </th>
                <th className="py-3 px-4 text-right">Net Position</th>
                <th className="py-3 px-4 text-center">Entries</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
              {filteredContent.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-slate-400">
                    No counterparties found.
                  </td>
                </tr>
              ) : (
                filteredContent.map((cp) => (
                  <tr
                    key={cp.id}
                    className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors"
                  >
                    <td
                      onClick={() => router.push(`/loans/lendings/${cp.id}`)}
                      className="py-3.5 px-4 font-bold text-slate-900 dark:text-slate-100 cursor-pointer"
                    >
                      {cp.name}
                      {cp.notes && (
                        <div className="text-[11px] font-normal text-slate-500 truncate max-w-xs">
                          {cp.notes}
                        </div>
                      )}
                    </td>
                    <td
                      onClick={() => router.push(`/loans/lendings/${cp.id}`)}
                      className="py-3.5 px-4 text-right font-medium text-emerald-600 dark:text-emerald-400 tabular-nums cursor-pointer"
                    >
                      {cp.totalLent > 0 ? formatMoney(cp.totalLent) : '—'}
                    </td>
                    <td
                      onClick={() => router.push(`/loans/lendings/${cp.id}`)}
                      className="py-3.5 px-4 text-right font-medium text-rose-600 dark:text-rose-400 tabular-nums cursor-pointer"
                    >
                      {cp.totalBorrowed > 0 ? formatMoney(cp.totalBorrowed) : '—'}
                    </td>
                    <td
                      onClick={() => router.push(`/loans/lendings/${cp.id}`)}
                      className="py-3.5 px-4 text-right font-extrabold tabular-nums cursor-pointer"
                    >
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
                    <td
                      onClick={() => router.push(`/loans/lendings/${cp.id}`)}
                      className="py-3.5 px-4 text-center cursor-pointer"
                    >
                      <Badge variant="outline" className="text-[10px]">
                        {cp.entryCount} entries
                      </Badge>
                    </td>
                    <td className="py-3.5 px-4 text-right">
                      <ConfirmationDialog
                        title="Delete Counterparty"
                        description={`Delete ${cp.name}? This permanently deletes their entire ledger history (${cp.entryCount} entries).`}
                        primaryAction={() => handleDeleteCp(cp)}
                        primaryActionText="Delete Person"
                        variant="destructive"
                        trigger={
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            className="text-slate-400 hover:text-rose-600"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        }
                      />
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
        <DialogContent className="sm:max-w-md w-[95vw]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold">Add Ledger Entry</DialogTitle>
          </DialogHeader>

          <DialogBody>
            <form id="add-lending-form" onSubmit={handleCreateLending} className="space-y-3 pt-1 text-xs">
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
                    <span>I gave money (Lent)</span>
                  </label>
                  <label className="flex items-center gap-1.5 cursor-pointer font-medium text-rose-600 dark:text-rose-400 text-xs">
                    <input
                      type="radio"
                      name="lendingDir"
                      checked={direction === 'borrowed'}
                      onChange={() => setDirection('borrowed')}
                    />
                    <span>I received money (Borrowed)</span>
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
                  <Label htmlFor="entryDate" className="text-xs">Date *</Label>
                  <Input
                    id="entryDate"
                    type="date"
                    value={entryDate}
                    onChange={(e) => setEntryDate(e.target.value)}
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
            </form>
          </DialogBody>

          <DialogFooter
            primaryAction={{
              label: loading ? 'Saving...' : 'Save Entry',
              type: 'submit',
              form: 'add-lending-form',
              disabled: loading,
            }}
            secondaryAction={{
              label: 'Cancel',
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

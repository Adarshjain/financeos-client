'use client';

import {ArrowDownLeft, ArrowLeft, ArrowUpRight, Edit2, Plus, Trash2,} from 'lucide-react';
import Link from 'next/link';
import {useRouter} from 'next/navigation';
import {useMemo, useState} from 'react';
import {toast} from 'sonner';

import {
  createLendingAction,
  deleteCounterpartyAction,
  deleteLendingAction,
  fetchLendingsAction,
  updateCounterpartyAction,
  updateLendingAction,
} from '@/actions/lendings';
import {ConfirmationDialog} from '@/components/ConfirmationDialog';
import {PageActionBar} from '@/components/layout/PageActionBarContext';
import {Badge} from '@/components/ui/badge';
import {Button} from '@/components/ui/button';
import {Card} from '@/components/ui/card';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {Input} from '@/components/ui/input';
import {Label} from '@/components/ui/label';
import {Textarea} from '@/components/ui/textarea';
import type {CounterpartyResponse, LendingDirection, LendingResponse,} from '@/lib/types';
import {formatDate, formatMoney} from '@/lib/utils';

interface CounterpartyDetailProps {
  counterparty: CounterpartyResponse;
  initialLendings: LendingResponse[];
}

export function CounterpartyDetail({
                                     counterparty,
                                     initialLendings,
                                   }: CounterpartyDetailProps) {
  const router = useRouter();

  const [cp, setCp] = useState<CounterpartyResponse>(counterparty);
  const [lendings, setLendings] = useState<LendingResponse[]>(initialLendings);

  // Edit Counterparty Details State
  const [editCpOpen, setEditCpOpen] = useState(false);
  const [cpName, setCpName] = useState(cp.name);
  const [cpNotes, setCpNotes] = useState(cp.notes ?? '');
  const [submittingCp, setSubmittingCp] = useState(false);

  // Add Entry State
  const [addEntryOpen, setAddEntryOpen] = useState(false);
  const [addDir, setAddDir] = useState<LendingDirection>('lent');
  const [addAmount, setAddAmount] = useState('');
  const [addEntryDate, setAddEntryDate] = useState(new Date().toISOString().split('T')[0]);
  const [addExpDate, setAddExpDate] = useState('');
  const [addNotes, setAddNotes] = useState('');
  const [submittingAddEntry, setSubmittingAddEntry] = useState(false);

  // Edit Entry State
  const [editLendingOpen, setEditLendingOpen] = useState(false);
  const [editingLending, setEditingLending] = useState<LendingResponse | null>(null);
  const [lendingDir, setLendingDir] = useState<LendingDirection>('lent');
  const [lendingAmount, setLendingAmount] = useState('');
  const [lendingDate, setLendingDate] = useState('');
  const [lendingExpDate, setLendingExpDate] = useState('');
  const [lendingNotes, setLendingNotes] = useState('');
  const [submittingEditLending, setSubmittingEditLending] = useState(false);

  const refreshData = async () => {
    const res = await fetchLendingsAction(cp.id, 0, 200);
    if (res.success) {
      setLendings(res.data.content);
      let lent = 0;
      let borrowed = 0;

      for (const l of res.data.content) {
        if (l.direction === 'lent') lent += l.amount;
        else if (l.direction === 'borrowed') borrowed += l.amount;
      }
      setCp((prev) => ({
        ...prev,
        totalLent: lent,
        totalBorrowed: borrowed,
        netPosition: lent - borrowed,
        entryCount: res.data.content.length,
      }));
    }
  };

  // Sort entries ASCENDING by date for running balance calculation
  const sortedEntries = useMemo(() => {
    return [...lendings].sort((a, b) => a.entryDate.localeCompare(b.entryDate));
  }, [lendings]);

  // Compute running cumulative balance for each entry down the table
  const entriesWithRunningBalance = useMemo(() => {
    let runningNet = 0;
    return sortedEntries.map((entry) => {
      if (entry.direction === 'lent') {
        runningNet += entry.amount;
      } else {
        runningNet -= entry.amount;
      }
      return {
        ...entry,
        runningBalance: runningNet,
      };
    });
  }, [sortedEntries]);

  const handleUpdateCp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cpName.trim()) {
      toast.error('Name is required');
      return;
    }
    setSubmittingCp(true);
    try {
      const res = await updateCounterpartyAction(cp.id, {
        name: cpName.trim(),
        notes: cpNotes.trim() || undefined,
      });
      if (res.success) {
        toast.success('Person details updated');
        setCp(res.data);
        setEditCpOpen(false);
      } else {
        toast.error(res.error.message);
      }
    } finally {
      setSubmittingCp(false);
    }
  };

  const handleDeleteCp = async () => {
    const res = await deleteCounterpartyAction(cp.id);
    if (res.success) {
      toast.success('Person deleted');
      router.push('/loans/lendings');
    } else {
      toast.error(res.error.message);
    }
  };

  const handleAddEntry = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addAmount || Number(addAmount) <= 0) {
      toast.error('Amount must be greater than zero');
      return;
    }
    setSubmittingAddEntry(true);
    try {
      const res = await createLendingAction({
        counterpartyId: cp.id,
        direction: addDir,
        amount: Number(addAmount),
        entryDate: addEntryDate,
        expectedReturnDate: addExpDate || undefined,
        notes: addNotes.trim() || undefined,
      });
      if (res.success) {
        toast.success('Entry added');
        setAddEntryOpen(false);
        setAddAmount('');
        setAddNotes('');
        setAddExpDate('');
        await refreshData();
      } else {
        toast.error(res.error.message);
      }
    } finally {
      setSubmittingAddEntry(false);
    }
  };

  const handleDeleteLending = async (lendingId: string) => {
    const res = await deleteLendingAction(lendingId, cp.id);
    if (res.success) {
      toast.success('Entry deleted');
      await refreshData();
    } else {
      toast.error(res.error.message);
    }
  };

  const handleOpenEditLending = (lending: LendingResponse) => {
    setEditingLending(lending);
    setLendingDir(lending.direction);
    setLendingAmount(String(lending.amount));
    setLendingDate(lending.entryDate);
    setLendingExpDate(lending.expectedReturnDate ?? '');
    setLendingNotes(lending.notes ?? '');
    setEditLendingOpen(true);
  };

  const handleUpdateLending = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingLending) return;
    setSubmittingEditLending(true);
    try {
      const res = await updateLendingAction(
          editingLending.id,
          {
            direction: lendingDir,
            amount: lendingAmount ? Number(lendingAmount) : undefined,
            entryDate: lendingDate || undefined,
            expectedReturnDate: lendingExpDate || undefined,
            notes: lendingNotes.trim() || undefined,
          },
          cp.id,
      );
      if (res.success) {
        toast.success('Entry updated');
        setEditLendingOpen(false);
        await refreshData();
      } else {
        toast.error(res.error.message);
      }
    } finally {
      setSubmittingEditLending(false);
    }
  };

  return (
      <div className="space-y-2 p-3 pb-32 max-w-7xl mx-auto w-full">
        {/* Top Header Action Bar */}
        <PageActionBar>
          <div className="flex items-center gap-2 w-full">
            <Button
                variant="outline"
                size="sm"
                onClick={() => setEditCpOpen(true)}
                className="flex-1"
            >
              <Edit2 className="h-3.5 w-3.5"/> Edit Person
            </Button>

            <ConfirmationDialog
                title="Delete Counterparty"
                description={`Delete ${cp.name}? This permanently deletes their entire ledger history (${cp.entryCount} entries).`}
                primaryAction={handleDeleteCp}
                primaryActionText="Delete Person"
                variant="destructive"
                trigger={
                  <Button variant="destructive" size="sm" className="flex-1">
                    <Trash2 className="h-3.5 w-3.5"/> Delete Person
                  </Button>
                }
            />
          </div>
        </PageActionBar>

        {/* Back Link */}
        <Link
            href="/loans/lendings"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 dark:hover:text-slate-100 font-medium mt-2"
        >
          <ArrowLeft className="h-3.5 w-3.5"/> Back to Lendings Ledger
        </Link>

        {/* Header Container */}
        <div
            className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-slate-100 flex items-center gap-3">
              {cp.name}
              <span
                  className={`text-sm sm:text-base font-extrabold px-2.5 py-0.5 rounded-md ${
                      cp.netPosition > 0
                          ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/60 dark:text-emerald-400'
                          : cp.netPosition < 0
                              ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/60 dark:text-rose-400'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                  }`}
              >
              {cp.netPosition > 0 ? '+' : ''}{formatMoney(cp.netPosition)}
            </span>
            </h1>
            {cp.notes && <p className="text-xs text-slate-500 mt-1">{cp.notes}</p>}
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <div className="text-[10px] text-slate-500 font-semibold uppercase">Total Lent</div>
              <div
                  className="text-sm font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">{formatMoney(cp.totalLent)}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 font-semibold uppercase">Total Borrowed</div>
              <div
                  className="text-sm font-bold text-rose-600 dark:text-rose-400 tabular-nums">{formatMoney(cp.totalBorrowed)}</div>
            </div>
          </div>

        </div>

        {/* Mobile View: Standalone Cards */}
        <div className="block md:hidden space-y-3">
          <div className="flex items-center justify-between px-1">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Ledger History ({entriesWithRunningBalance.length})
            </h2>
            <Button size="sm" onClick={() => setAddEntryOpen(true)}>
              <Plus className="h-3.5 w-3.5"/> Add Entry
            </Button>
          </div>

          {entriesWithRunningBalance.length === 0 ? (
              <Card className="p-8 text-center text-xs text-slate-400 bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-sm">
                No ledger entries recorded for {cp.name}.
              </Card>
          ) : (
              entriesWithRunningBalance.map((item) => (
                  <Card key={item.id} className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-sm p-3 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-500">{formatDate(item.entryDate)}</span>
                      <span
                          className={`font-bold text-sm tabular-nums ${
                              item.direction === 'lent'
                                  ? 'text-rose-600 dark:text-rose-400'
                                  : 'text-emerald-600 dark:text-emerald-400'
                          }`}
                      >
                        {item.direction === 'lent' ? '-' : ''}{formatMoney(item.amount)}
                      </span>
                    </div>

                    {item.notes && <p className="text-xs text-slate-600 dark:text-slate-400 font-normal">{item.notes}</p>}
                    {item.expectedReturnDate && (
                        <p className="text-[11px] text-slate-500">
                          Expected Return: <span
                            className="font-medium text-slate-700 dark:text-slate-300">{formatDate(item.expectedReturnDate)}</span>
                        </p>
                    )}

                    <div
                        className="flex items-center justify-between text-xs">
                      <div>
                        <span className="text-slate-400 text-[10px] block font-medium">Running Balance</span>
                        <span
                            className={`font-bold tabular-nums ${
                                item.runningBalance > 0
                                    ? 'text-emerald-600 dark:text-emerald-400'
                                    : item.runningBalance < 0
                                        ? 'text-rose-600 dark:text-rose-400'
                                        : 'text-slate-500'
                            }`}
                        >
                          {item.runningBalance > 0 ? '+' : ''}
                          {formatMoney(item.runningBalance)}
                        </span>
                      </div>

                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon-xs" onClick={() => handleOpenEditLending(item)}
                                className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300">
                          <Edit2 className="h-3.5 w-3.5"/>
                        </Button>
                        <ConfirmationDialog
                            title="Delete Ledger Entry"
                            description={`Delete this ${item.direction} entry of ${formatMoney(item.amount)}?`}
                            primaryAction={() => handleDeleteLending(item.id)}
                            primaryActionText="Delete Entry"
                            variant="destructive"
                            trigger={
                              <Button variant="ghost" size="icon-xs"
                                      className="text-slate-400 hover:text-rose-600">
                                <Trash2 className="h-3.5 w-3.5"/>
                              </Button>
                            }
                        />
                      </div>
                    </div>
                  </Card>
              ))
          )}
        </div>

        {/* Desktop View: Ledger Container Table */}
        <div
            className="hidden md:block bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">
              Ledger History ({entriesWithRunningBalance.length} entries)
            </h2>
          </div>

          {entriesWithRunningBalance.length === 0 ? (
              <div className="py-12 text-center text-xs text-slate-400">
                No ledger entries recorded for {cp.name}.
              </div>
          ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                  <tr className="bg-slate-50/80 dark:bg-slate-900 border-b border-slate-200/80 dark:border-slate-800 font-semibold text-slate-500 uppercase tracking-wider text-[10px]">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Direction</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                    <th className="py-3 px-4 text-right">Running Balance</th>
                    <th className="py-3 px-4">Expected Return</th>
                    <th className="py-3 px-4">Notes</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                  {entriesWithRunningBalance.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                        <td className="py-3.5 px-4 font-medium text-slate-900 dark:text-slate-100 whitespace-nowrap">
                          {formatDate(item.entryDate)}
                        </td>
                        <td className="py-3.5 px-4">
                          <Badge
                              variant={item.direction === 'lent' ? 'default' : 'destructive'}
                              className="capitalize text-[10px] inline-flex items-center gap-1"
                          >
                            {item.direction === 'lent' ? <ArrowUpRight className="h-3 w-3"/> :
                                <ArrowDownLeft className="h-3 w-3"/>}
                            {item.direction === 'lent' ? 'I Lent' : 'I Borrowed'}
                          </Badge>
                        </td>
                        <td className="py-3.5 px-4 text-right font-bold text-slate-900 dark:text-slate-100 tabular-nums">
                          {formatMoney(item.amount)}
                        </td>
                        <td className="py-3.5 px-4 text-right font-extrabold tabular-nums">
                      <span
                          className={
                            item.runningBalance > 0
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : item.runningBalance < 0
                                    ? 'text-rose-600 dark:text-rose-400'
                                    : 'text-slate-500'
                          }
                      >
                        {item.runningBalance > 0 ? '+' : ''}
                        {formatMoney(item.runningBalance)}
                      </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 whitespace-nowrap">
                          {item.expectedReturnDate ? formatDate(item.expectedReturnDate) : '—'}
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 max-w-xs truncate">
                          {item.notes ?? '—'}
                        </td>
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <div className="flex items-center justify-end gap-1">
                            <Button variant="ghost" size="icon-xs" onClick={() => handleOpenEditLending(item)}
                                    className="text-slate-400 hover:text-slate-600">
                              <Edit2 className="h-3.5 w-3.5"/>
                            </Button>
                            <ConfirmationDialog
                                title="Delete Ledger Entry"
                                description={`Delete this ${item.direction} entry of ${formatMoney(item.amount)}?`}
                                primaryAction={() => handleDeleteLending(item.id)}
                                primaryActionText="Delete Entry"
                                variant="destructive"
                                trigger={
                                  <Button variant="ghost" size="icon-xs"
                                          className="text-slate-400 hover:text-rose-600">
                                    <Trash2 className="h-3.5 w-3.5"/>
                                  </Button>
                                }
                            />
                          </div>
                        </td>
                      </tr>
                  ))}
                  </tbody>
                </table>
              </div>
          )}
        </div>

        {/* Edit Counterparty Dialog */}
        <Dialog open={editCpOpen} onOpenChange={setEditCpOpen}>
          <DialogContent className="sm:max-w-md w-[95vw]">
            <DialogHeader><DialogTitle className="text-base font-bold">Edit Person Details</DialogTitle></DialogHeader>
            <DialogBody>
              <form id="edit-cp-form" onSubmit={handleUpdateCp} className="space-y-3 pt-1 text-xs">
                <div className="space-y-1">
                  <Label className="text-xs">Name *</Label>
                  <Input value={cpName} onChange={(e) => setCpName(e.target.value)} required className="h-9 text-xs"/>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Notes</Label>
                  <Textarea rows={2} value={cpNotes} onChange={(e) => setCpNotes(e.target.value)} className="text-xs"/>
                </div>
              </form>
            </DialogBody>
            <DialogFooter
              primaryAction={{
                label: submittingCp ? 'Saving...' : 'Save Changes',
                type: 'submit',
                form: 'edit-cp-form',
                disabled: submittingCp,
              }}
              secondaryAction={{
                label: 'Cancel',
              }}
            />
          </DialogContent>
        </Dialog>

        {/* Add Entry Dialog */}
        <Dialog open={addEntryOpen} onOpenChange={setAddEntryOpen}>
          <DialogContent className="sm:max-w-md w-[95vw]">
            <DialogHeader>
              <DialogTitle className="text-base font-bold">Add Ledger Entry for {cp.name}</DialogTitle>
            </DialogHeader>
            <DialogBody>
              <form id="add-entry-form" onSubmit={handleAddEntry} className="space-y-3 pt-1 text-xs">
                <div className="space-y-1">
                  <Label className="text-xs">Direction *</Label>
                  <div className="flex gap-4 pt-1">
                    <label
                        className="flex items-center gap-1.5 cursor-pointer font-medium text-emerald-600 dark:text-emerald-400 text-xs">
                      <input
                          type="radio"
                          name="addDir"
                          checked={addDir === 'lent'}
                          onChange={() => setAddDir('lent')}
                      />
                      <span>I gave money (Lent)</span>
                    </label>
                    <label
                        className="flex items-center gap-1.5 cursor-pointer font-medium text-rose-600 dark:text-rose-400 text-xs">
                      <input
                          type="radio"
                          name="addDir"
                          checked={addDir === 'borrowed'}
                          onChange={() => setAddDir('borrowed')}
                      />
                      <span>I received money (Borrowed)</span>
                    </label>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Amount (₹) *</Label>
                    <Input
                        type="number"
                        step="0.01"
                        placeholder="5000"
                        value={addAmount}
                        onChange={(e) => setAddAmount(e.target.value)}
                        required
                        className="h-9 text-xs"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Date *</Label>
                    <Input
                        type="date"
                        value={addEntryDate}
                        onChange={(e) => setAddEntryDate(e.target.value)}
                        required
                        className="h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Expected Return Date (Optional)</Label>
                  <Input
                      type="date"
                      value={addExpDate}
                      onChange={(e) => setAddExpDate(e.target.value)}
                      className="h-9 text-xs"
                  />
                </div>

                <div className="space-y-1">
                  <Label className="text-xs">Notes (Optional)</Label>
                  <Textarea
                      rows={2}
                      placeholder="Notes..."
                      value={addNotes}
                      onChange={(e) => setAddNotes(e.target.value)}
                      className="text-xs"
                  />
                </div>
              </form>
            </DialogBody>
            <DialogFooter
              primaryAction={{
                label: submittingAddEntry ? 'Saving...' : 'Add Entry',
                type: 'submit',
                form: 'add-entry-form',
                disabled: submittingAddEntry,
              }}
              secondaryAction={{
                label: 'Cancel',
              }}
            />
          </DialogContent>
        </Dialog>

        {/* Edit Entry Dialog */}
        <Dialog open={editLendingOpen} onOpenChange={setEditLendingOpen}>
          <DialogContent className="sm:max-w-md w-[95vw]">
            <DialogHeader><DialogTitle className="text-base font-bold">Edit Ledger Entry</DialogTitle></DialogHeader>
            <DialogBody>
              <form id="edit-lending-form" onSubmit={handleUpdateLending} className="space-y-3 pt-1 text-xs">
                <div className="space-y-1">
                  <Label className="text-xs">Direction</Label>
                  <div className="flex gap-4 pt-1">
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                      <input type="radio" name="editDir" checked={lendingDir === 'lent'}
                             onChange={() => setLendingDir('lent')}/>
                      <span>I gave money (Lent)</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                      <input type="radio" name="editDir" checked={lendingDir === 'borrowed'}
                             onChange={() => setLendingDir('borrowed')}/>
                      <span>I received money (Borrowed)</span>
                    </label>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">Amount (₹)</Label>
                    <Input type="number" step="0.01" value={lendingAmount}
                           onChange={(e) => setLendingAmount(e.target.value)} className="h-9 text-xs"/>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Date</Label>
                    <Input type="date" value={lendingDate} onChange={(e) => setLendingDate(e.target.value)}
                           className="h-9 text-xs"/>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Expected Return Date</Label>
                  <Input type="date" value={lendingExpDate} onChange={(e) => setLendingExpDate(e.target.value)}
                         className="h-9 text-xs"/>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Notes</Label>
                  <Textarea rows={2} value={lendingNotes} onChange={(e) => setLendingNotes(e.target.value)}
                            className="text-xs"/>
                </div>
              </form>
            </DialogBody>
            <DialogFooter
              primaryAction={{
                label: submittingEditLending ? 'Saving...' : 'Save Changes',
                type: 'submit',
                form: 'edit-lending-form',
                disabled: submittingEditLending,
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

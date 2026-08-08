'use client';

import {
  ArrowDownLeft,
  ArrowLeft,
  ArrowUpRight,
  ChevronDown,
  ChevronUp,
  Edit2,
  Plus,
  Trash2,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import {
  addLendingRepaymentAction,
  deleteCounterpartyAction,
  deleteLendingAction,
  deleteLendingRepaymentAction,
  fetchLendingsAction,
  reopenLendingAction,
  updateCounterpartyAction,
  updateLendingAction,
  writeOffLendingAction,
} from '@/actions/lendings';
import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import { PageActionBar } from '@/components/layout/PageActionBarContext';
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
import { Textarea } from '@/components/ui/textarea';
import type {
  CounterpartyResponse,
  LendingDirection,
  LendingResponse,
} from '@/lib/types';
import { formatDate, formatMoney } from '@/lib/utils';

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
  const [expandedLendingId, setExpandedLendingId] = useState<string | null>(null);

  // Edit Counterparty Name State
  const [editCpOpen, setEditCpOpen] = useState(false);
  const [cpName, setCpName] = useState(cp.name);
  const [cpNotes, setCpNotes] = useState(cp.notes ?? '');
  const [submittingCp, setSubmittingCp] = useState(false);

  // Add Repayment State
  const [repayOpen, setRepayOpen] = useState(false);
  const [selectedLending, setSelectedLending] = useState<LendingResponse | null>(null);
  const [repayAmount, setRepayAmount] = useState('');
  const [repayDate, setRepayDate] = useState(new Date().toISOString().split('T')[0]);
  const [repayTxId, setRepayTxId] = useState('');
  const [submittingRepay, setSubmittingRepay] = useState(false);

  // Edit Lending State
  const [editLendingOpen, setEditLendingOpen] = useState(false);
  const [editingLending, setEditingLending] = useState<LendingResponse | null>(null);
  const [lendingDir, setLendingDir] = useState<LendingDirection>('lent');
  const [lendingAmount, setLendingAmount] = useState('');
  const [lendingDate, setLendingDate] = useState('');
  const [lendingExpDate, setLendingExpDate] = useState('');
  const [lendingNotes, setLendingNotes] = useState('');
  const [submittingEditLending, setSubmittingEditLending] = useState(false);

  const refreshData = async () => {
    const res = await fetchLendingsAction(cp.id, undefined, 0, 100);
    if (res.success) {
      setLendings(res.data.content);
      let lent = 0;
      let borrowed = 0;
      let openCount = 0;

      for (const l of res.data.content) {
        if (l.status !== 'settled' && l.status !== 'written_off') {
          openCount++;
          if (l.direction === 'lent') lent += l.outstanding;
          else borrowed += l.outstanding;
        }
      }
      setCp((prev) => ({
        ...prev,
        lentOutstanding: lent,
        borrowedOutstanding: borrowed,
        netPosition: lent - borrowed,
        openLendingCount: openCount,
      }));
    }
  };

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

  const handleOpenRepay = (lending: LendingResponse) => {
    setSelectedLending(lending);
    setRepayAmount(String(lending.outstanding));
    setRepayDate(new Date().toISOString().split('T')[0]);
    setRepayTxId('');
    setRepayOpen(true);
  };

  const handleAddRepayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLending) return;
    setSubmittingRepay(true);
    try {
      const res = await addLendingRepaymentAction(
        selectedLending.id,
        {
          amount: Number(repayAmount),
          date: repayDate,
          transactionId: repayTxId.trim() || undefined,
        },
        cp.id,
      );
      if (res.success) {
        toast.success('Repayment recorded');
        setRepayOpen(false);
        await refreshData();
      } else {
        toast.error(res.error.message);
      }
    } finally {
      setSubmittingRepay(false);
    }
  };

  const handleDeleteRepayment = async (lendingId: string, repaymentId: string) => {
    const res = await deleteLendingRepaymentAction(lendingId, repaymentId, cp.id);
    if (res.success) {
      toast.success('Repayment deleted');
      await refreshData();
    } else {
      toast.error(res.error.message);
    }
  };

  const handleWriteOff = async (lendingId: string) => {
    const res = await writeOffLendingAction(lendingId, cp.id);
    if (res.success) {
      toast.success('Lending written off');
      await refreshData();
    } else {
      toast.error(res.error.message);
    }
  };

  const handleReopen = async (lendingId: string) => {
    const res = await reopenLendingAction(lendingId, cp.id);
    if (res.success) {
      toast.success('Lending reopened');
      await refreshData();
    } else {
      toast.error(res.error.message);
    }
  };

  const handleDeleteLending = async (lendingId: string) => {
    const res = await deleteLendingAction(lendingId, cp.id);
    if (res.success) {
      toast.success('Lending deleted');
      await refreshData();
    } else {
      toast.error(res.error.message);
    }
  };

  const handleOpenEditLending = (lending: LendingResponse) => {
    setEditingLending(lending);
    setLendingDir(lending.direction);
    setLendingAmount(String(lending.amount));
    setLendingDate(lending.lendDate);
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
          lendDate: lendingDate || undefined,
          expectedReturnDate: lendingExpDate || undefined,
          notes: lendingNotes.trim() || undefined,
        },
        cp.id,
      );
      if (res.success) {
        toast.success('Lending updated');
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
    <div className="space-y-4">
      {/* Top Header Action Bar */}
      <PageActionBar>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setEditCpOpen(true)}
            className="h-8 text-xs gap-1.5"
          >
            <Edit2 className="h-3.5 w-3.5" /> Edit Person
          </Button>

          <ConfirmationDialog
            title="Delete Counterparty"
            description={`Delete "${cp.name}"? Allowed only if zero lendings exist.`}
            primaryAction={handleDeleteCp}
            primaryActionText="Delete Person"
            variant="destructive"
            trigger={
              <Button variant="destructive" size="sm" className="h-8 text-xs gap-1.5">
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </Button>
            }
          />
        </div>
      </PageActionBar>

      {/* Back Link */}
      <Link
        href="/loans/lendings"
        className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 font-medium"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Lendings Ledger
      </Link>

      {/* Header Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">{cp.name}</h1>
          {cp.notes && <p className="text-xs text-slate-500 mt-1">{cp.notes}</p>}
        </div>

        <div className="grid grid-cols-3 gap-3 bg-slate-50 dark:bg-slate-950 p-3 rounded-lg border border-slate-200/80 dark:border-slate-800 text-xs self-start sm:self-auto">
          <div>
            <div className="text-[10px] text-slate-500 font-semibold uppercase">Lent</div>
            <div className="text-sm font-bold text-emerald-600 dark:text-emerald-400">{formatMoney(cp.lentOutstanding)}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-semibold uppercase">Borrowed</div>
            <div className="text-sm font-bold text-rose-600 dark:text-rose-400">{formatMoney(cp.borrowedOutstanding)}</div>
          </div>
          <div>
            <div className="text-[10px] text-slate-500 font-semibold uppercase">Net</div>
            <div className={`text-sm font-bold ${cp.netPosition >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
              {cp.netPosition >= 0 ? '+' : ''}{formatMoney(cp.netPosition)}
            </div>
          </div>
        </div>
      </div>

      {/* Lendings List Container (No Cards Inside Cards!) */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800">
          <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Lendings History ({lendings.length})</h2>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {lendings.length === 0 ? (
            <div className="py-12 text-center text-xs text-slate-400">
              No lendings recorded for {cp.name}.
            </div>
          ) : (
            lendings.map((item) => {
              const isExpanded = expandedLendingId === item.id;

              return (
                <div key={item.id}>
                  <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={item.direction === 'lent' ? 'default' : 'destructive'}
                          className="capitalize text-[10px] flex items-center gap-1"
                        >
                          {item.direction === 'lent' ? <ArrowUpRight className="h-3 w-3" /> : <ArrowDownLeft className="h-3 w-3" />}
                          {item.direction === 'lent' ? 'Lent' : 'Borrowed'}
                        </Badge>
                        <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{formatMoney(item.amount)}</span>
                        <span className="text-slate-500 text-xs">· {formatDate(item.lendDate)}</span>
                      </div>
                      {item.expectedReturnDate && (
                        <p className="text-[11px] text-slate-500">
                          Expected Return Date: <span className="font-medium text-slate-800 dark:text-slate-200">{formatDate(item.expectedReturnDate)}</span>
                        </p>
                      )}
                      {item.notes && <p className="text-[11px] text-slate-500">{item.notes}</p>}
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4">
                      <div className="text-left sm:text-right">
                        <div className="text-[10px] text-slate-500 uppercase font-semibold">Outstanding</div>
                        <div className="font-bold text-sm text-slate-900 dark:text-slate-100">{formatMoney(item.outstanding)}</div>
                      </div>

                      <div className="flex items-center gap-1">
                        {item.status !== 'settled' && item.status !== 'written_off' && (
                          <Button size="sm" onClick={() => handleOpenRepay(item)} className="h-7 text-xs gap-1">
                            <Plus className="h-3 w-3" /> Repayment
                          </Button>
                        )}

                        {item.status !== 'settled' && item.status !== 'written_off' && (
                          <ConfirmationDialog
                            title="Write Off Remaining Balance"
                            description={`Forgive remaining balance of ${formatMoney(item.outstanding)}?`}
                            primaryAction={() => handleWriteOff(item.id)}
                            primaryActionText="Write Off"
                            variant="destructive"
                            trigger={
                              <Button variant="outline" size="sm" className="h-7 text-xs text-rose-600 border-rose-200 dark:border-rose-900">
                                Write-Off
                              </Button>
                            }
                          />
                        )}

                        {item.status === 'written_off' && (
                          <Button variant="outline" size="sm" onClick={() => handleReopen(item.id)} className="h-7 text-xs">
                            Reopen
                          </Button>
                        )}

                        <Button variant="ghost" size="icon" onClick={() => handleOpenEditLending(item)} className="h-7 w-7 text-slate-400">
                          <Edit2 className="h-3.5 w-3.5" />
                        </Button>

                        <ConfirmationDialog
                          title="Delete Lending"
                          description="Delete this lending entry and all associated repayments?"
                          primaryAction={() => handleDeleteLending(item.id)}
                          primaryActionText="Delete"
                          variant="destructive"
                          trigger={
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-rose-600">
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          }
                        />

                        <Button variant="ghost" size="icon" onClick={() => setExpandedLendingId(isExpanded ? null : item.id)} className="h-7 w-7 text-slate-400">
                          {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                  </div>

                  {/* Repayments History */}
                  {isExpanded && (
                    <div className="p-4 bg-slate-50/50 dark:bg-slate-950/40 border-t border-slate-100 dark:border-slate-800 space-y-2">
                      <div className="font-semibold text-slate-500 text-[11px] uppercase tracking-wider">
                        Repayments History ({item.repayments.length})
                      </div>
                      {item.repayments.length === 0 ? (
                        <p className="text-slate-400 italic text-[11px]">No repayments recorded.</p>
                      ) : (
                        <div className="space-y-1.5">
                          {item.repayments.map((rep) => (
                            <div key={rep.id} className="flex items-center justify-between p-2 rounded bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 text-xs">
                              <div>
                                <span className="font-bold text-emerald-600">+{formatMoney(rep.amount)}</span> · Date: <span className="font-medium">{formatDate(rep.date)}</span>
                              </div>
                              <Button variant="ghost" size="sm" onClick={() => handleDeleteRepayment(item.id, rep.id)} className="h-6 px-2 text-[10px] text-slate-400 hover:text-rose-600">
                                Delete
                              </Button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Dialogs */}
      <Dialog open={editCpOpen} onOpenChange={setEditCpOpen}>
        <DialogContent className="sm:max-w-md w-[95vw] p-4 sm:p-6">
          <DialogHeader><DialogTitle className="text-base font-bold">Edit Person Details</DialogTitle></DialogHeader>
          <form onSubmit={handleUpdateCp} className="space-y-3 pt-1 text-xs">
            <div className="space-y-1">
              <Label className="text-xs">Name *</Label>
              <Input value={cpName} onChange={(e) => setCpName(e.target.value)} required className="h-9 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Notes</Label>
              <Textarea rows={2} value={cpNotes} onChange={(e) => setCpNotes(e.target.value)} className="text-xs" />
            </div>
            <DialogFooter className="pt-2 flex flex-row gap-2 justify-end">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditCpOpen(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={submittingCp}>{submittingCp ? 'Saving...' : 'Save Changes'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={repayOpen} onOpenChange={setRepayOpen}>
        <DialogContent className="sm:max-w-md w-[95vw] p-4 sm:p-6">
          <DialogHeader><DialogTitle className="text-base font-bold">Record Repayment</DialogTitle></DialogHeader>
          <form onSubmit={handleAddRepayment} className="space-y-3 pt-1 text-xs">
            <div className="space-y-1">
              <Label className="text-xs">Repayment Amount (₹) *</Label>
              <Input type="number" step="0.01" value={repayAmount} onChange={(e) => setRepayAmount(e.target.value)} required className="h-9 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Date *</Label>
              <Input type="date" value={repayDate} onChange={(e) => setRepayDate(e.target.value)} required className="h-9 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Transaction ID (Optional)</Label>
              <Input placeholder="UUID of transaction" value={repayTxId} onChange={(e) => setRepayTxId(e.target.value)} className="h-9 text-xs" />
            </div>
            <DialogFooter className="pt-2 flex flex-row gap-2 justify-end">
              <Button type="button" variant="outline" size="sm" onClick={() => setRepayOpen(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={submittingRepay}>{submittingRepay ? 'Saving...' : 'Confirm Repayment'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editLendingOpen} onOpenChange={setEditLendingOpen}>
        <DialogContent className="sm:max-w-md w-[95vw] p-4 sm:p-6">
          <DialogHeader><DialogTitle className="text-base font-bold">Edit Lending Entry</DialogTitle></DialogHeader>
          <form onSubmit={handleUpdateLending} className="space-y-3 pt-1 text-xs">
            <div className="space-y-1">
              <Label className="text-xs">Direction</Label>
              <div className="flex gap-4 pt-1">
                <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                  <input type="radio" name="editDir" checked={lendingDir === 'lent'} onChange={() => setLendingDir('lent')} disabled={editingLending?.repayments.length ? editingLending.repayments.length > 0 : false} />
                  <span>Lent</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                  <input type="radio" name="editDir" checked={lendingDir === 'borrowed'} onChange={() => setLendingDir('borrowed')} disabled={editingLending?.repayments.length ? editingLending.repayments.length > 0 : false} />
                  <span>Borrowed</span>
                </label>
              </div>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs">Amount (₹)</Label>
                <Input type="number" step="0.01" value={lendingAmount} onChange={(e) => setLendingAmount(e.target.value)} disabled={editingLending?.repayments.length ? editingLending.repayments.length > 0 : false} className="h-9 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Lend Date</Label>
                <Input type="date" value={lendingDate} onChange={(e) => setLendingDate(e.target.value)} disabled={editingLending?.repayments.length ? editingLending.repayments.length > 0 : false} className="h-9 text-xs" />
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Expected Return Date</Label>
              <Input type="date" value={lendingExpDate} onChange={(e) => setLendingExpDate(e.target.value)} className="h-9 text-xs" />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Notes</Label>
              <Textarea rows={2} value={lendingNotes} onChange={(e) => setLendingNotes(e.target.value)} className="text-xs" />
            </div>
            <DialogFooter className="pt-2 flex flex-row gap-2 justify-end">
              <Button type="button" variant="outline" size="sm" onClick={() => setEditLendingOpen(false)}>Cancel</Button>
              <Button type="submit" size="sm" disabled={submittingEditLending}>{submittingEditLending ? 'Saving...' : 'Save Changes'}</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

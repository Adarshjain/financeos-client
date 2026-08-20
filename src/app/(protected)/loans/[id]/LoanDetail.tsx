'use client';

import {
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Edit2,
  Lock,
  Plus,
  RefreshCw,
  Sparkles,
  Trash2,
  Unlock,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

import {
  addLoanChargeAction,
  addLoanEventAction,
  addLoanPaymentAction,
  addLoanPaymentsBatchAction,
  closeLoanAction,
  deleteLoanAction,
  deleteLoanChargeAction,
  deleteLoanEventAction,
  deleteLoanPaymentAction,
  fetchLoanDetailAction,
  fetchLoanScheduleAction,
  fetchMatchSuggestionsAction,
  reopenLoanAction,
} from '@/actions/loans';
import { LoanForm } from '@/app/(protected)/loans/LoanForm';
import { ConfirmationDialog } from '@/components/ConfirmationDialog';
import { PageActionBar } from '@/components/layout/PageActionBarContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import type { Account } from '@/lib/account.types';
import type {
  AdjustmentMode,
  InstallmentDto,
  LoanChargeType,
  LoanDetailResponse,
  LoanEventType,
  MatchSuggestionsResponse,
} from '@/lib/types';
import { formatDate, formatMoney } from '@/lib/utils';

interface LoanDetailProps {
  initialDetail: LoanDetailResponse;
  initialSchedule: InstallmentDto[];
  bankAccounts: Account[];
}

export function LoanDetail({
  initialDetail,
  initialSchedule,
  bankAccounts,
}: LoanDetailProps) {
  const router = useRouter();

  const [detail, setDetail] = useState<LoanDetailResponse>(initialDetail);
  const [schedule, setSchedule] = useState<InstallmentDto[]>(initialSchedule);

  const [editOpen, setEditOpen] = useState(false);
  const [addEventOpen, setAddEventOpen] = useState(false);
  const [addChargeOpen, setAddChargeOpen] = useState(false);
  const [markPaidOpen, setMarkPaidOpen] = useState(false);
  const [selectedInstallment, setSelectedInstallment] = useState<InstallmentDto | null>(null);

  // Match Suggestions State
  const [matchLoading, setMatchLoading] = useState(false);
  const [matchSuggestions, setMatchSuggestions] = useState<MatchSuggestionsResponse | null>(null);

  // FY Collapsible states
  const [expandedFYs, setExpandedFYs] = useState<Record<string, boolean>>({});

  // Payment dialog form state
  const [paymentDate, setPaymentDate] = useState('');
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentTxId, setPaymentTxId] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);

  // Event dialog form state
  const [eventType, setEventType] = useState<LoanEventType>('rate_change');
  const [effectiveDate, setEffectiveDate] = useState(new Date().toISOString().split('T')[0]);
  const [newAnnualRatePct, setNewAnnualRatePct] = useState('');
  const [eventAmount, setEventAmount] = useState('');
  const [adjustmentMode, setAdjustmentMode] = useState<AdjustmentMode>('reduce_tenure');
  const [newEmiOverride, setNewEmiOverride] = useState('');
  const [eventTxId, setEventTxId] = useState('');
  const [submittingEvent, setSubmittingEvent] = useState(false);

  // Charge dialog form state
  const [chargeType, setChargeType] = useState<LoanChargeType>('processing_fee');
  const [chargeAmount, setChargeAmount] = useState('');
  const [chargeDate, setChargeDate] = useState(new Date().toISOString().split('T')[0]);
  const [chargeNotes, setChargeNotes] = useState('');
  const [chargeTxId, setChargeTxId] = useState('');
  const [submittingCharge, setSubmittingCharge] = useState(false);

  const loan = detail.loan;
  const hasEventsOrPayments = detail.events.length > 0 || schedule.some((i) => i.status === 'settled');

  const refreshData = async () => {
    const [dRes, sRes] = await Promise.all([
      fetchLoanDetailAction(loan.id),
      fetchLoanScheduleAction(loan.id),
    ]);
    if (dRes.success) setDetail(dRes.data);
    if (sRes.success) setSchedule(sRes.data.installments);
  };

  const getFYGroupKey = (dateStr: string) => {
    const date = new Date(dateStr);
    const year = date.getFullYear();
    const month = date.getMonth();
    const fyStart = month >= 3 ? year : year - 1;
    return `FY ${fyStart}-${(fyStart + 1).toString().slice(-2)}`;
  };

  const today = new Date();
  const currentFY = getFYGroupKey(today.toISOString().split('T')[0]);

  const fyGroups = schedule.reduce((acc, inst) => {
    const fy = getFYGroupKey(inst.dueDate);
    if (!acc[fy]) acc[fy] = [];
    acc[fy].push(inst);
    return acc;
  }, {} as Record<string, InstallmentDto[]>);

  const toggleFY = (fy: string) => {
    setExpandedFYs((prev) => ({
      ...prev,
      [fy]: prev[fy] === undefined ? fy !== currentFY : !prev[fy],
    }));
  };

  const handleOpenMarkPaid = (inst: InstallmentDto) => {
    setSelectedInstallment(inst);
    setPaymentDate(inst.dueDate);
    setPaymentAmount(String(inst.emi));
    setPaymentTxId('');
    setMarkPaidOpen(true);
  };

  const handleSettlePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInstallment) return;
    setSubmittingPayment(true);
    try {
      const res = await addLoanPaymentAction(loan.id, {
        installmentSeq: selectedInstallment.seq,
        paymentDate,
        amount: Number(paymentAmount),
        transactionId: paymentTxId.trim() || undefined,
      });
      if (res.success) {
        toast.success(`Installment #${selectedInstallment.seq} marked as paid`);
        setMarkPaidOpen(false);
        await refreshData();
      } else {
        toast.error(res.error.message);
      }
    } finally {
      setSubmittingPayment(false);
    }
  };

  const handleUnlinkPayment = async (paymentId: string) => {
    const res = await deleteLoanPaymentAction(loan.id, paymentId);
    if (res.success) {
      toast.success('Payment unlinked');
      await refreshData();
    } else {
      toast.error(res.error.message);
    }
  };

  const handleAddEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingEvent(true);
    try {
      const res = await addLoanEventAction(loan.id, {
        eventType,
        effectiveDate,
        newAnnualRatePct: newAnnualRatePct ? Number(newAnnualRatePct) : undefined,
        amount: eventAmount ? Number(eventAmount) : undefined,
        adjustmentMode: eventType !== 'foreclosure' ? adjustmentMode : undefined,
        newEmiOverride:
          eventType !== 'foreclosure' && adjustmentMode === 'reduce_emi' && newEmiOverride
            ? Number(newEmiOverride)
            : undefined,
        transactionId: eventTxId.trim() || undefined,
      });
      if (res.success) {
        toast.success('Event recorded');
        setAddEventOpen(false);
        await refreshData();
      } else {
        toast.error(res.error.message);
      }
    } finally {
      setSubmittingEvent(false);
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    const res = await deleteLoanEventAction(loan.id, eventId);
    if (res.success) {
      toast.success('Event deleted');
      await refreshData();
    } else {
      toast.error(res.error.message);
    }
  };

  const handleAddCharge = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingCharge(true);
    try {
      const res = await addLoanChargeAction(loan.id, {
        chargeType,
        amount: Number(chargeAmount),
        chargeDate,
        notes: chargeNotes.trim() || undefined,
        transactionId: chargeTxId.trim() || undefined,
      });
      if (res.success) {
        toast.success('Charge added');
        setAddChargeOpen(false);
        await refreshData();
      } else {
        toast.error(res.error.message);
      }
    } finally {
      setSubmittingCharge(false);
    }
  };

  const handleDeleteCharge = async (chargeId: string) => {
    const res = await deleteLoanChargeAction(loan.id, chargeId);
    if (res.success) {
      toast.success('Charge deleted');
      await refreshData();
    } else {
      toast.error(res.error.message);
    }
  };

  const handleFindMatches = async () => {
    setMatchLoading(true);
    try {
      const res = await fetchMatchSuggestionsAction(loan.id);
      if (res.success) {
        setMatchSuggestions(res.data);
        if (res.data.suggestions.every((s) => s.candidates.length === 0)) {
          toast.info('No matching bank transactions found (±7 days)');
        }
      } else {
        toast.error(res.error.message);
      }
    } finally {
      setMatchLoading(false);
    }
  };

  const handleConfirmMatch = async (seq: number, date: string, amount: number, txId: string) => {
    const res = await addLoanPaymentAction(loan.id, {
      installmentSeq: seq,
      paymentDate: date,
      amount,
      transactionId: txId,
    });
    if (res.success) {
      toast.success(`Matched installment #${seq}`);
      await refreshData();
      await handleFindMatches();
    } else {
      toast.error(res.error.message);
    }
  };

  const handleConfirmAllMatches = async () => {
    if (!matchSuggestions) return;
    const itemsToConfirm = matchSuggestions.suggestions
      .filter((s) => s.candidates.length > 0)
      .map((s) => ({
        installmentSeq: s.installmentSeq,
        paymentDate: s.candidates[0].date,
        amount: s.candidates[0].amount < 0 ? Math.abs(s.candidates[0].amount) : s.candidates[0].amount,
        transactionId: s.candidates[0].id,
      }));

    if (itemsToConfirm.length === 0) return;

    const res = await addLoanPaymentsBatchAction(loan.id, { items: itemsToConfirm });
    if (res.success) {
      toast.success(`Batch confirmed ${res.data.created} payments`);
      await refreshData();
      await handleFindMatches();
    } else {
      toast.error(res.error.message);
    }
  };

  const progressPct =
    loan.totalInstallments > 0
      ? Math.round((loan.settledInstallments / loan.totalInstallments) * 100)
      : 0;

  return (
    <div className="space-y-2 p-3 pb-32">
      {/* Top Header Action Bar */}
      <PageActionBar>
        <div className="flex items-center gap-2 w-full">
          <Button variant="outline" size="sm" onClick={() => setEditOpen(true)} className="flex-1">
            <Edit2 className="h-3.5 w-3.5" /> Edit
          </Button>

          {loan.status === 'active' ? (
            <ConfirmationDialog
              title="Close Loan"
              description={`Are you sure you want to mark "${loan.name}" as closed?`}
              primaryAction={async () => {
                const res = await closeLoanAction(loan.id);
                if (res.success) {
                  toast.success('Loan closed');
                  await refreshData();
                } else {
                  toast.error(res.error.message);
                }
              }}
              primaryActionText="Close Loan"
              variant="default"
              trigger={
                <Button variant="outline" size="sm" className="flex-1">
                  <Lock className="h-3.5 w-3.5" /> Close
                </Button>
              }
            />
          ) : (
            <ConfirmationDialog
              title="Reopen Loan"
              description={`Reopen loan "${loan.name}"?`}
              primaryAction={async () => {
                const res = await reopenLoanAction(loan.id);
                if (res.success) {
                  toast.success('Loan reopened');
                  await refreshData();
                } else {
                  toast.error(res.error.message);
                }
              }}
              primaryActionText="Reopen Loan"
              variant="default"
              trigger={
                <Button variant="outline" size="sm" className="flex-1">
                  <Unlock className="h-3.5 w-3.5" /> Reopen
                </Button>
              }
            />
          )}

          <ConfirmationDialog
            title="Delete Loan"
            description={`Delete "${loan.name}" and all associated schedule data?`}
            primaryAction={async () => {
              const res = await deleteLoanAction(loan.id);
              if (res.success) {
                toast.success('Loan deleted');
                router.push('/loans');
              } else {
                toast.error(res.error.message);
              }
            }}
            primaryActionText="Delete Loan"
            variant="destructive"
            trigger={
              <Button variant="destructive" size="sm" className="flex-1">
                <Trash2 className="h-3.5 w-3.5" /> Delete
              </Button>
            }
          />
        </div>
      </PageActionBar>

      {/* Back Link */}
      <Link
        href="/loans"
        className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-900 font-medium"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to Loans Overview
      </Link>

      {/* Clean Single Header Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl p-4 sm:p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-slate-100">{loan.name}</h1>
              <Badge variant="outline" className="capitalize text-[10px]">
                {loan.loanType.replace('_', ' ')}
              </Badge>
              <Badge
                variant={
                  loan.status === 'active'
                    ? 'default'
                    : loan.status === 'closed'
                    ? 'secondary'
                    : 'destructive'
                }
                className="capitalize text-[10px]"
              >
                {loan.status}
              </Badge>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Lender: <span className="font-semibold text-slate-800 dark:text-slate-200">{loan.lender}</span>
              {loan.loanAccountNumber ? ` · Account #${loan.loanAccountNumber}` : ''}
            </p>
          </div>

          <div className="flex items-center gap-3 bg-slate-50 dark:bg-slate-950 p-2.5 rounded-lg border border-slate-200/80 dark:border-slate-800 self-start sm:self-auto">
            <div>
              <div className="text-[10px] text-slate-500 font-semibold uppercase">Nominal Rate</div>
              <div className="text-base font-bold text-slate-900 dark:text-slate-100">{loan.currentAnnualRatePct}%</div>
            </div>
            <div className="h-6 w-px bg-slate-200 dark:bg-slate-800" />
            <div>
              <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold uppercase flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Effective APR
              </div>
              <div className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                {loan.effectiveAprPct != null ? `${loan.effectiveAprPct}%` : 'N/A'}
              </div>
            </div>
          </div>
        </div>

        {/* 4 Stat Metrics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800 text-xs">
          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-semibold">Outstanding Balance</span>
            <span className="text-lg font-bold text-emerald-600 dark:text-emerald-400">
              {formatMoney(loan.outstandingPrincipal)}
            </span>
            <span className="text-[10px] text-slate-500 block">
              Original: {formatMoney(loan.principal)}
            </span>
          </div>

          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-semibold">Current EMI</span>
            <span className="text-base font-bold text-slate-900 dark:text-slate-100">
              {formatMoney(loan.currentEmi)}
            </span>
            <span className="text-[10px] text-slate-500 block">
              Next due: {loan.nextDueDate ? formatDate(loan.nextDueDate) : 'None'}
            </span>
          </div>

          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-semibold">Interest Paid</span>
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
              {formatMoney(loan.totalInterestPaid)}
            </span>
            <span className="text-[10px] text-slate-500 block">
              {formatMoney(loan.totalInterestRemaining)} remaining
            </span>
          </div>

          <div>
            <span className="text-slate-500 block text-[10px] uppercase font-semibold">Timeline</span>
            <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
              {loan.settledInstallments} / {loan.totalInstallments} EMIs
            </span>
            <span className="text-[10px] text-slate-500 block">
              Ends: {loan.projectedEndDate ? formatDate(loan.projectedEndDate) : '—'}
            </span>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-1 pt-1">
          <div className="flex justify-between text-[11px] text-slate-500">
            <span>Amortization Progress</span>
            <span>{progressPct}% Settled</span>
          </div>
          <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-emerald-500 h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Match Suggestions Inline Banner */}
      <div className="bg-emerald-50/60 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-xl p-4 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
            <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
              EMI Transaction Matching
            </span>
          </div>
          <div className="flex gap-2">
            {matchSuggestions && matchSuggestions.suggestions.some((s) => s.candidates.length > 0) && (
              <Button size="xs" onClick={handleConfirmAllMatches}>
                <CheckCircle2 className="h-3 w-3" /> Confirm All
              </Button>
            )}
            <Button
              variant="outline"
              size="xs"
              onClick={handleFindMatches}
              disabled={matchLoading}
            >
              <RefreshCw className={`h-3 w-3 ${matchLoading ? 'animate-spin' : ''}`} />
              {matchLoading ? 'Searching...' : 'Find Matches'}
            </Button>
          </div>
        </div>

        {matchSuggestions && (
          <div className="space-y-2 text-xs pt-1">
            {matchSuggestions.suggestions.every((s) => s.candidates.length === 0) ? (
              <p className="text-slate-500 italic">No matching bank transactions found for due or overdue installments.</p>
            ) : (
              matchSuggestions.suggestions
                .filter((s) => s.candidates.length > 0)
                .map((s) => (
                  <div key={s.installmentSeq} className="p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg space-y-1.5">
                    <div className="flex justify-between font-medium">
                      <span>Installment #{s.installmentSeq} · Due {formatDate(s.dueDate)}</span>
                      <span className="text-emerald-600 font-bold">EMI: {formatMoney(s.expectedAmount)}</span>
                    </div>
                    <div className="space-y-1 pt-1">
                      {s.candidates.map((cand) => (
                        <div key={cand.id} className="flex items-center justify-between p-2 rounded bg-slate-50 dark:bg-slate-950 text-xs">
                          <span>{formatDate(cand.date)} · {cand.description || 'DEBIT'} ({formatMoney(Math.abs(cand.amount))})</span>
                          <Button size="micro" onClick={() => handleConfirmMatch(s.installmentSeq, cand.date, Math.abs(cand.amount), cand.id)}>
                            Confirm
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                ))
            )}
          </div>
        )}
      </div>

      {/* Amortization Schedule Container */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-900 dark:text-slate-100">Amortization Schedule</h2>
            <p className="text-xs text-slate-500">Per-EMI interest/principal split computed on demand.</p>
          </div>
        </div>

        <div className="divide-y divide-slate-100 dark:divide-slate-800">
          {Object.entries(fyGroups).map(([fy, items]) => {
            const isExpanded = expandedFYs[fy] ?? fy === currentFY;

            return (
              <div key={fy}>
                <button
                  type="button"
                  onClick={() => toggleFY(fy)}
                  className="w-full flex items-center justify-between px-4 py-3 bg-slate-50/80 dark:bg-slate-950/60 text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-900 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span>{fy}</span>
                    <Badge variant="outline" className="text-[10px] font-normal">
                      {items.length} EMIs
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-slate-500 font-normal hidden sm:inline">
                      Σ Principal: {formatMoney(items.reduce((s, i) => s + i.principal, 0))}
                    </span>
                    {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </div>
                </button>

                {isExpanded && (
                  <div>
                    {/* Mobile View: Flat List (No Cards!) */}
                    <div className="block md:hidden divide-y divide-slate-100 dark:divide-slate-800">
                      {items.map((inst) => (
                        <div key={inst.seq} className="p-3.5 space-y-1.5 text-xs">
                          <div className="flex items-center justify-between font-medium">
                            <span>#{inst.seq} · {formatDate(inst.dueDate)}</span>
                            <Badge
                              variant={
                                inst.status === 'settled'
                                  ? 'default'
                                  : inst.status === 'overdue'
                                  ? 'destructive'
                                  : 'outline'
                              }
                              className="capitalize text-[10px]"
                            >
                              {inst.status}
                            </Badge>
                          </div>
                          <div className="grid grid-cols-3 gap-2 text-[11px]">
                            <div>
                              <span className="text-slate-500 block">EMI</span>
                              <span className="font-bold">{formatMoney(inst.emi)}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 block">Interest</span>
                              <span className="text-rose-600 font-medium">{formatMoney(inst.interest)}</span>
                            </div>
                            <div>
                              <span className="text-slate-500 block">Principal</span>
                              <span className="text-emerald-600 font-medium">{formatMoney(inst.principal)}</span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between pt-1 border-t border-slate-100 dark:border-slate-800">
                            <span className="text-slate-500 text-[10px]">Closing: {formatMoney(inst.closingBalance)}</span>
                            {inst.status === 'settled' && inst.payment ? (
                              <Button
                                variant="ghost"
                                size="micro"
                                onClick={() => handleUnlinkPayment(inst.payment!.id)}
                                className="text-slate-500 hover:text-rose-600"
                              >
                                Unlink
                              </Button>
                            ) : (
                              <Button
                                variant="outline"
                                size="micro"
                                onClick={() => handleOpenMarkPaid(inst)}
                              >
                                Mark Paid
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Desktop View: Table */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left text-xs border-collapse">
                        <thead>
                          <tr className="bg-slate-50/50 dark:bg-slate-950/40 border-b border-slate-200/80 dark:border-slate-800 font-semibold text-slate-500 uppercase text-[10px]">
                            <th className="py-2.5 px-4 w-12 text-center">#</th>
                            <th className="py-2.5 px-4">Due Date</th>
                            <th className="py-2.5 px-4 text-right">Opening Bal</th>
                            <th className="py-2.5 px-4 text-right">EMI</th>
                            <th className="py-2.5 px-4 text-right">Interest</th>
                            <th className="py-2.5 px-4 text-right">Principal</th>
                            <th className="py-2.5 px-4 text-right">Closing Bal</th>
                            <th className="py-2.5 px-4 text-center">Status</th>
                            <th className="py-2.5 px-4 text-right">Action</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 dark:divide-slate-800/60">
                          {items.map((inst) => (
                            <tr
                              key={inst.seq}
                              className={
                                inst.status === 'settled'
                                  ? 'bg-emerald-500/5 dark:bg-emerald-950/20'
                                  : inst.status === 'overdue'
                                  ? 'bg-rose-500/5 dark:bg-rose-950/20'
                                  : ''
                              }
                            >
                              <td className="py-2.5 px-4 text-center font-mono font-medium">{inst.seq}</td>
                              <td className="py-2.5 px-4 font-medium">{formatDate(inst.dueDate)}</td>
                              <td className="py-2.5 px-4 text-right text-slate-500">{formatMoney(inst.openingBalance)}</td>
                              <td className="py-2.5 px-4 text-right font-bold text-slate-900 dark:text-slate-100">{formatMoney(inst.emi)}</td>
                              <td className="py-2.5 px-4 text-right text-rose-600 dark:text-rose-400">{formatMoney(inst.interest)}</td>
                              <td className="py-2.5 px-4 text-right text-emerald-600 dark:text-emerald-400 font-medium">{formatMoney(inst.principal)}</td>
                              <td className="py-2.5 px-4 text-right text-slate-500 font-mono">{formatMoney(inst.closingBalance)}</td>
                              <td className="py-2.5 px-4 text-center">
                                <Badge
                                  variant={
                                    inst.status === 'settled'
                                      ? 'default'
                                      : inst.status === 'overdue'
                                      ? 'destructive'
                                      : 'outline'
                                  }
                                  className="capitalize text-[10px]"
                                >
                                  {inst.status}
                                </Badge>
                              </td>
                              <td className="py-2.5 px-4 text-right">
                                {inst.status === 'settled' && inst.payment ? (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleUnlinkPayment(inst.payment!.id)}
                                    className="h-6 px-2 text-[10px] text-slate-500 hover:text-rose-600"
                                  >
                                    Unlink
                                  </Button>
                                ) : (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleOpenMarkPaid(inst)}
                                    className="h-6 px-2 text-[10px]"
                                  >
                                    Mark Paid
                                  </Button>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Events & Charges Side-By-Side Sections */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Events */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Lifecycle Events</h2>
            <Button size="xs" variant="outline" onClick={() => setAddEventOpen(true)}>
              <Plus className="h-3 w-3" /> Add Event
            </Button>
          </div>
          <div className="p-4 space-y-2 text-xs">
            {detail.events.length === 0 ? (
              <p className="text-slate-400 italic">No lifecycle events recorded.</p>
            ) : (
              detail.events.map((evt) => (
                <div key={evt.id} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950">
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="capitalize text-[10px]">{evt.eventType.replace('_', ' ')}</Badge>
                      <span className="font-bold">{formatDate(evt.effectiveDate)}</span>
                    </div>
                    <div className="text-slate-500 text-[11px]">
                      {evt.eventType === 'rate_change' && `New Rate: ${evt.newAnnualRatePct}% (${evt.adjustmentMode})`}
                      {evt.eventType === 'prepayment' && `Amount: ${formatMoney(evt.amount)} (${evt.adjustmentMode})`}
                      {evt.eventType === 'foreclosure' && `Foreclosure Paid: ${formatMoney(evt.amount)}`}
                    </div>
                  </div>
                  <Button variant="ghost" size="icon-xs" onClick={() => handleDeleteEvent(evt.id)} className="text-slate-400 hover:text-rose-600">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Charges */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 rounded-xl shadow-sm overflow-hidden">
          <div className="p-4 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 dark:text-slate-100">Itemized Charges</h2>
            <Button size="xs" variant="outline" onClick={() => setAddChargeOpen(true)}>
              <Plus className="h-3 w-3" /> Add Charge
            </Button>
          </div>
          <div className="p-4 space-y-2 text-xs">
            {detail.charges.length === 0 ? (
              <p className="text-slate-400 italic">No charges recorded.</p>
            ) : (
              detail.charges.map((chg) => (
                <div key={chg.id} className="flex items-center justify-between p-2.5 rounded-lg border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="capitalize text-[10px]">{chg.chargeType.replace('_', ' ')}</Badge>
                      <span className="font-bold text-rose-600">{formatMoney(chg.amount)}</span>
                      <span className="text-slate-500">· {formatDate(chg.chargeDate)}</span>
                    </div>
                    {chg.notes && <p className="text-slate-500 text-[11px]">{chg.notes}</p>}
                  </div>
                  <Button variant="ghost" size="icon-xs" onClick={() => handleDeleteCharge(chg.id)} className="text-slate-400 hover:text-rose-600">
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Edit Loan Form */}
      <LoanForm open={editOpen} onOpenChange={setEditOpen} bankAccounts={bankAccounts} loanToEdit={loan} hasEventsOrPayments={hasEventsOrPayments} />

      {/* Dialogs */}
      <Dialog open={markPaidOpen} onOpenChange={setMarkPaidOpen}>
        <DialogContent className="sm:max-w-md w-[95vw]">
          <DialogHeader><DialogTitle className="text-base font-bold">Settle Installment #{selectedInstallment?.seq}</DialogTitle></DialogHeader>
          <DialogBody>
            <form id="settle-payment-form" onSubmit={handleSettlePayment} className="space-y-3 pt-1 text-xs">
              <div className="space-y-1">
                <Label className="text-xs">Payment Date *</Label>
                <Input type="date" value={paymentDate} onChange={(e) => setPaymentDate(e.target.value)} required className="h-9 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Payment Amount (₹) *</Label>
                <Input type="number" step="0.01" value={paymentAmount} onChange={(e) => setPaymentAmount(e.target.value)} required className="h-9 text-xs" />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Transaction ID (Optional)</Label>
                <Input placeholder="UUID of DEBIT transaction" value={paymentTxId} onChange={(e) => setPaymentTxId(e.target.value)} className="h-9 text-xs" />
              </div>
            </form>
          </DialogBody>
          <DialogFooter
            primaryAction={{
              label: submittingPayment ? 'Saving...' : 'Confirm Settle',
              type: 'submit',
              form: 'settle-payment-form',
              disabled: submittingPayment,
            }}
            secondaryAction={{
              label: 'Cancel',
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={addEventOpen} onOpenChange={setAddEventOpen}>
        <DialogContent className="sm:max-w-md w-[95vw]">
          <DialogHeader><DialogTitle className="text-base font-bold">Record Lifecycle Event</DialogTitle></DialogHeader>
          <DialogBody>
            <form id="add-event-form" onSubmit={handleAddEvent} className="space-y-3 pt-1 text-xs">
              <div className="space-y-1">
                <Label className="text-xs">Event Type *</Label>
                <Select value={eventType} onValueChange={(v) => setEventType(v as LoanEventType)}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rate_change" className="text-xs">Rate Change</SelectItem>
                    <SelectItem value="prepayment" className="text-xs">Prepayment</SelectItem>
                    <SelectItem value="foreclosure" className="text-xs">Foreclosure</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Effective Date *</Label>
                <Input type="date" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} required className="h-9 text-xs" />
              </div>

              {eventType === 'rate_change' && (
                <div className="space-y-1">
                  <Label className="text-xs">New Annual Rate (%) *</Label>
                  <Input type="number" step="0.01" placeholder="e.g. 9.25" value={newAnnualRatePct} onChange={(e) => setNewAnnualRatePct(e.target.value)} required className="h-9 text-xs" />
                </div>
              )}

              {(eventType === 'prepayment' || eventType === 'foreclosure') && (
                <div className="space-y-1">
                  <Label className="text-xs">Amount (₹) *</Label>
                  <Input type="number" step="0.01" placeholder="e.g. 100000" value={eventAmount} onChange={(e) => setEventAmount(e.target.value)} required className="h-9 text-xs" />
                </div>
              )}

              {eventType !== 'foreclosure' && (
                <div className="space-y-1">
                  <Label className="text-xs">Adjustment Mode *</Label>
                  <div className="flex gap-4 pt-1">
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                      <input type="radio" name="adjMode" checked={adjustmentMode === 'reduce_tenure'} onChange={() => setAdjustmentMode('reduce_tenure')} />
                      <span>Reduce Tenure</span>
                    </label>
                    <label className="flex items-center gap-1.5 cursor-pointer text-xs">
                      <input type="radio" name="adjMode" checked={adjustmentMode === 'reduce_emi'} onChange={() => setAdjustmentMode('reduce_emi')} />
                      <span>Reduce EMI</span>
                    </label>
                  </div>
                </div>
              )}

              {eventType !== 'foreclosure' && adjustmentMode === 'reduce_emi' && (
                <div className="space-y-1">
                  <Label className="text-xs">New EMI Override (Optional)</Label>
                  <Input type="number" step="0.01" placeholder="Auto if blank" value={newEmiOverride} onChange={(e) => setNewEmiOverride(e.target.value)} className="h-9 text-xs" />
                </div>
              )}

              <div className="space-y-1">
                <Label className="text-xs">Linked Transaction ID (Optional)</Label>
                <Input placeholder="UUID of transaction" value={eventTxId} onChange={(e) => setEventTxId(e.target.value)} className="h-9 text-xs" />
              </div>
            </form>
          </DialogBody>
          <DialogFooter
            primaryAction={{
              label: submittingEvent ? 'Saving...' : 'Record Event',
              type: 'submit',
              form: 'add-event-form',
              disabled: submittingEvent,
            }}
            secondaryAction={{
              label: 'Cancel',
            }}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={addChargeOpen} onOpenChange={setAddChargeOpen}>
        <DialogContent className="sm:max-w-md w-[95vw]">
          <DialogHeader><DialogTitle className="text-base font-bold">Add Itemized Charge</DialogTitle></DialogHeader>
          <DialogBody>
            <form id="add-charge-form" onSubmit={handleAddCharge} className="space-y-3 pt-1 text-xs">
              <div className="space-y-1">
                <Label className="text-xs">Charge Type *</Label>
                <Select value={chargeType} onValueChange={(v) => setChargeType(v as LoanChargeType)}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue placeholder="Select type" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="processing_fee" className="text-xs">Processing Fee</SelectItem>
                    <SelectItem value="insurance_premium" className="text-xs">Insurance Premium</SelectItem>
                    <SelectItem value="foreclosure_charge" className="text-xs">Foreclosure Charge</SelectItem>
                    <SelectItem value="bounce_charge" className="text-xs">Bounce Charge</SelectItem>
                    <SelectItem value="late_fee" className="text-xs">Late Fee</SelectItem>
                    <SelectItem value="legal_valuation" className="text-xs">Legal / Valuation</SelectItem>
                    <SelectItem value="other" className="text-xs">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Amount (₹) *</Label>
                <Input type="number" step="0.01" placeholder="e.g. 5000" value={chargeAmount} onChange={(e) => setChargeAmount(e.target.value)} required className="h-9 text-xs" />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Charge Date *</Label>
                <Input type="date" value={chargeDate} onChange={(e) => setChargeDate(e.target.value)} required className="h-9 text-xs" />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Notes (Optional)</Label>
                <Textarea rows={2} placeholder="Description..." value={chargeNotes} onChange={(e) => setChargeNotes(e.target.value)} className="text-xs" />
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Linked Transaction ID (Optional)</Label>
                <Input placeholder="UUID of transaction" value={chargeTxId} onChange={(e) => setChargeTxId(e.target.value)} className="h-9 text-xs" />
              </div>
            </form>
          </DialogBody>
          <DialogFooter
            primaryAction={{
              label: submittingCharge ? 'Saving...' : 'Add Charge',
              type: 'submit',
              form: 'add-charge-form',
              disabled: submittingCharge,
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

'use client';

import {
  AlertCircle,
  Calendar,
  CheckCircle2,
  ChevronRight,
  Clock,
  CreditCard as CreditCardIcon,
  DollarSign,
  Info,
  Link as LinkIcon,
  MoreVertical,
  Pencil,
  Plus,
  Receipt,
  Trash2,
  X,
} from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';

import {
  clearCardFeeCharge,
  createCardFeeTerm,
  deleteCardFeeTerm,
  getCardFeeSchedule,
  listCardFeeTerms,
  listFeeChargeCandidates,
  updateCardFeeTerm,
  upsertCardFeeCharge,
} from '@/actions/cardFees';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { EmptyState } from '@/components/ui/empty-state';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { Account, CreditCard } from '@/lib/account.types';
import {
  CardFeeKind,
  CardFeeSchedule,
  CardFeeTerm,
  FEE_STATUS_META,
  feeAllIn,
  FeeChargeCandidate,
  FeeOccurrence,
  FeeOccurrenceStatus,
  FeeWaiverBasis,
  FeeWaiverSource,
} from '@/lib/cardFees.types';
import { accountAnniversaryDate, anniversaryYearRange } from '@/lib/rewards.types';
import { AccountStatus } from '@/lib/types';
import { sanitizeDecimalInput } from '@/lib/utils';

function getErrorMessage(err: unknown): string {
  if (typeof err === 'string') return err;
  if (err && typeof err === 'object' && 'message' in err && typeof (err as { message: unknown }).message === 'string') {
    return (err as { message: string }).message;
  }
  return 'An unexpected error occurred';
}

interface CardFeeManagerProps {
  accounts: Account[];
  initialAccountId?: string;
}

export default function CardFeeManager({
  accounts,
  initialAccountId,
}: CardFeeManagerProps) {
  const creditCards = accounts.filter(
    (a): a is CreditCard => a.type === 'credit_card',
  );

  const [selectedAccountId, setSelectedAccountId] = useState<string>(
    initialAccountId || creditCards[0]?.id || '',
  );

  const selectedAccount = creditCards.find((c) => c.id === selectedAccountId);

  const [terms, setTerms] = useState<CardFeeTerm[]>([]);
  const [schedule, setSchedule] = useState<CardFeeSchedule | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Term Modal state
  const [isTermModalOpen, setIsTermModalOpen] = useState(false);
  const [editingTerm, setEditingTerm] = useState<CardFeeTerm | null>(null);
  const [termKind, setTermKind] = useState<CardFeeKind>(CardFeeKind.ANNUAL_FEE);
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [amount, setAmount] = useState('');
  const [gstRate, setGstRate] = useState('18');
  const [waiverThreshold, setWaiverThreshold] = useState('');
  const [waiverBasis, setWaiverBasis] = useState<FeeWaiverBasis>(
    FeeWaiverBasis.PRECEDING_FEE_YEAR,
  );
  const [note, setNote] = useState('');
  const [isSubmittingTerm, setIsSubmittingTerm] = useState(false);

  // Charge Override Modal state
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [activeOccurrence, setActiveOccurrence] =
    useState<FeeOccurrence | null>(null);
  const [waivedMode, setWaivedMode] = useState<'AUTO' | 'WAIVED' | 'CHARGED'>(
    'AUTO',
  );
  const [overrideAmountInput, setOverrideAmountInput] = useState('');
  const [candidates, setCandidates] = useState<FeeChargeCandidate[]>([]);
  const [selectedTxnIds, setSelectedTxnIds] = useState<string[]>([]);
  const [overrideNote, setOverrideNote] = useState('');
  const [isLoadingCandidates, setIsLoadingCandidates] = useState(false);
  const [isSubmittingOverride, setIsSubmittingOverride] = useState(false);

  const [showAllHistory, setShowAllHistory] = useState(false);

  const loadData = useCallback(async (accId: string, allHistory: boolean = showAllHistory) => {
    if (!accId) return;
    setIsLoading(true);

    const selectedCard = accounts.find((a) => a.id === accId);
    let fromStr: string;
    let toStr: string;

    if (allHistory) {
      fromStr = `${new Date().getFullYear() - 5}-01-01`;
      toStr = `${new Date().getFullYear() + 2}-12-31`;
    } else {
      const ann = accountAnniversaryDate(selectedCard);
      const prevRange = anniversaryYearRange(ann, -1);
      const nextRange = anniversaryYearRange(ann, 1);
      fromStr = prevRange.from.toISOString().split('T')[0];
      toStr = nextRange.to.toISOString().split('T')[0];
    }

    const [termsRes, scheduleRes] = await Promise.all([
      listCardFeeTerms(accId),
      getCardFeeSchedule({
        accountId: accId,
        from: fromStr,
        to: toStr,
      }),
    ]);

    if (termsRes.success) setTerms(termsRes.data || []);
    else toast.error(getErrorMessage(termsRes.error));

    if (scheduleRes.success) setSchedule(scheduleRes.data);
    else toast.error(getErrorMessage(scheduleRes.error));

    setIsLoading(false);
  }, [accounts, showAllHistory]);

  useEffect(() => {
    if (selectedAccountId) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadData(selectedAccountId, showAllHistory);
    }
  }, [selectedAccountId, showAllHistory, loadData]);

  const openCreateTerm = () => {
    setEditingTerm(null);
    setTermKind(CardFeeKind.ANNUAL_FEE);
    setEffectiveFrom(new Date().toISOString().split('T')[0]);
    setAmount('');
    setGstRate('18');
    setWaiverThreshold('');
    setWaiverBasis(FeeWaiverBasis.PRECEDING_FEE_YEAR);
    setNote('');
    setIsTermModalOpen(true);
  };

  const openEditTerm = (term: CardFeeTerm) => {
    setEditingTerm(term);
    setTermKind(term.kind);
    setEffectiveFrom(term.effectiveFrom);
    setAmount(term.amount ? String(term.amount) : '');
    setGstRate(term.gstRate !== undefined && term.gstRate !== null ? String(term.gstRate) : '18');
    setWaiverThreshold(
      term.waiverSpendThreshold ? String(term.waiverSpendThreshold) : '',
    );
    setWaiverBasis(term.waiverBasis || FeeWaiverBasis.PRECEDING_FEE_YEAR);
    setNote(term.note || '');
    setIsTermModalOpen(true);
  };

  const handleSaveTerm = async () => {
    if (!selectedAccountId || !effectiveFrom) return;
    setIsSubmittingTerm(true);

    const numAmount = amount ? parseFloat(amount) : undefined;
    const numGst = gstRate ? parseFloat(gstRate) : undefined;
    const numThreshold = waiverThreshold
      ? parseFloat(waiverThreshold)
      : undefined;

    const payload = {
      accountId: selectedAccountId,
      kind: termKind,
      effectiveFrom,
      amount: termKind === CardFeeKind.LTF ? undefined : numAmount,
      gstRate: termKind === CardFeeKind.LTF ? undefined : numGst,
      waiverSpendThreshold:
        termKind === CardFeeKind.ANNUAL_FEE ? numThreshold : undefined,
      waiverBasis:
        termKind === CardFeeKind.ANNUAL_FEE && numThreshold
          ? waiverBasis
          : undefined,
      note: note || undefined,
    };

    const res = editingTerm
      ? await updateCardFeeTerm(editingTerm.id, payload)
      : await createCardFeeTerm(payload);

    setIsSubmittingTerm(false);

    if (res.success) {
      toast.success(
        editingTerm ? 'Fee term updated' : 'Fee term created',
      );
      setIsTermModalOpen(false);
      loadData(selectedAccountId);
    } else {
      toast.error(getErrorMessage(res.error));
    }
  };

  const handleDeleteTerm = async (id: string) => {
    const res = await deleteCardFeeTerm(id);
    if (res.success) {
      toast.success('Fee term deleted');
      loadData(selectedAccountId);
    } else {
      toast.error(getErrorMessage(res.error));
    }
  };

  const openOverrideModal = async (occ: FeeOccurrence) => {
    setActiveOccurrence(occ);
    if (occ.waived === true) setWaivedMode('WAIVED');
    else if (occ.waived === false && occ.waiverSource === FeeWaiverSource.MANUAL)
      setWaivedMode('CHARGED');
    else setWaivedMode('AUTO');

    setOverrideAmountInput(
      occ.netAmount !== undefined ? String(occ.netAmount) : '',
    );
    setSelectedTxnIds(occ.transactionIds || []);
    setOverrideNote(occ.note || '');
    setIsOverrideModalOpen(true);

    setIsLoadingCandidates(true);
    const candRes = await listFeeChargeCandidates({
      accountId: selectedAccountId,
      kind: occ.kind,
      feeYearStart: occ.feeYearStart,
    });
    if (candRes.success) setCandidates(candRes.data || []);
    setIsLoadingCandidates(false);
  };

  const handleSaveOverride = async () => {
    if (!selectedAccountId || !activeOccurrence) return;
    setIsSubmittingOverride(true);

    let waived: boolean | undefined = undefined;
    if (waivedMode === 'WAIVED') waived = true;
    else if (waivedMode === 'CHARGED') waived = false;

    const overrideAmt = overrideAmountInput
      ? parseFloat(overrideAmountInput)
      : undefined;

    const res = await upsertCardFeeCharge({
      accountId: selectedAccountId,
      kind: activeOccurrence.kind,
      feeYearStart: activeOccurrence.feeYearStart,
      waived,
      overrideAmount: overrideAmt,
      transactionIds: selectedTxnIds,
      note: overrideNote || undefined,
    });

    setIsSubmittingOverride(false);

    if (res.success) {
      toast.success('Fee override saved');
      setIsOverrideModalOpen(false);
      loadData(selectedAccountId);
    } else {
      toast.error(getErrorMessage(res.error));
    }
  };

  const handleClearOverride = async () => {
    if (!selectedAccountId || !activeOccurrence) return;
    setIsSubmittingOverride(true);

    const res = await clearCardFeeCharge({
      accountId: selectedAccountId,
      kind: activeOccurrence.kind,
      feeYearStart: activeOccurrence.feeYearStart,
    });

    setIsSubmittingOverride(false);

    if (res.success) {
      toast.success('Fee override cleared');
      setIsOverrideModalOpen(false);
      loadData(selectedAccountId);
    } else {
      toast.error(getErrorMessage(res.error));
    }
  };

  if (creditCards.length === 0) {
    return (
      <EmptyState
        icon={CreditCardIcon}
        title="No credit cards configured"
        description="Add a credit card account to track membership fees, spend thresholds, and waivers."
      />
    );
  }

  return (
    <div className="space-y-6">
      {/* Account Selector */}
      <Card>
        <CardContent className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <Label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                Select Credit Card
              </Label>
              <Select
                value={selectedAccountId}
                onValueChange={setSelectedAccountId}
              >
                <SelectTrigger className="w-[280px] mt-1">
                  <SelectValue placeholder="Select a credit card" />
                </SelectTrigger>
                <SelectContent>
                  {creditCards.map((card) => (
                    <SelectItem key={card.id} value={card.id}>
                      <span className="flex items-center gap-2">
                        <span>{card.name}</span>
                        {card.last4 && (
                          <span className="text-xs text-slate-400">
                            (••• {card.last4})
                          </span>
                        )}
                        {card.status === AccountStatus.CLOSED && (
                          <Badge variant="outline" className="text-xs py-0">
                            Closed
                          </Badge>
                        )}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedAccount && !selectedAccount.anniversaryDate && (
              <div className="flex items-center gap-2 p-3 text-xs bg-amber-50 dark:bg-amber-950/40 text-amber-800 dark:text-amber-300 rounded-lg border border-amber-200 dark:border-amber-900">
                <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />
                <span>
                  Card anniversary date is missing. Fees will default to calendar
                  year. Edit account details to set anniversary date.
                </span>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Fee Terms Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-lg font-bold">
              Fee Terms Timeline
            </CardTitle>
            <CardDescription>
              Configured fee structures (joining fee, annual fee, LTF status).
            </CardDescription>
          </div>
          <Button size="sm" onClick={openCreateTerm} className="gap-1">
            <Plus className="h-4 w-4" /> Add Term
          </Button>
        </CardHeader>
        <CardContent>
          {terms.length === 0 ? (
            <div className="text-center py-8 text-sm text-slate-500 border border-dashed rounded-lg">
              No fee terms configured for this card yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800 border rounded-lg overflow-hidden">
              {terms.map((term) => {
                const total = term.totalAmount || 0;
                return (
                  <div
                    key={term.id}
                    className="p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            term.kind === CardFeeKind.LTF
                              ? 'secondary'
                              : term.kind === CardFeeKind.JOINING_FEE
                                ? 'outline'
                                : 'default'
                          }
                        >
                          {term.kind === CardFeeKind.LTF
                            ? 'Lifetime Free'
                            : term.kind === CardFeeKind.JOINING_FEE
                              ? 'Joining Fee'
                              : 'Annual Fee'}
                        </Badge>
                        <span className="text-xs text-slate-500">
                          Effective from {term.effectiveFrom}
                        </span>
                      </div>

                      {term.kind !== CardFeeKind.LTF && (
                        <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                          ₹{term.amount?.toLocaleString('en-IN')}{' '}
                          <span className="text-xs font-normal text-slate-500">
                            + {term.gstRate || 18}% GST = ₹
                            {total.toLocaleString('en-IN')}
                          </span>
                        </div>
                      )}

                      {term.waiverSpendThreshold && (
                        <div className="text-xs text-slate-600 dark:text-slate-400">
                          Spend Waiver: ₹
                          {term.waiverSpendThreshold.toLocaleString('en-IN')}{' '}
                          ({term.waiverBasis === FeeWaiverBasis.PRECEDING_FEE_YEAR
                            ? 'Preceding fee year'
                            : 'Same fee year'})
                        </div>
                      )}

                      <div className="text-xs text-slate-400">
                        First governs year starting {term.firstGovernedFeeYearStart}
                        {term.note && ` • ${term.note}`}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 self-end sm:self-center">
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => openEditTerm(term)}
                      >
                        <Pencil className="h-4 w-4 text-slate-500" />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => handleDeleteTerm(term.id)}
                      >
                        <Trash2 className="h-4 w-4 text-rose-500" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Derived Schedule Section */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <CardTitle className="text-lg font-bold">
              Fee Occurrences Schedule
            </CardTitle>
            <CardDescription>
              Calculated fee status per fee year, incorporating automatic spend waivers,
              pro-rata amortisation, and overrides.
            </CardDescription>
          </div>
          <Button
            size="sm"
            variant={showAllHistory ? 'secondary' : 'outline'}
            onClick={() => setShowAllHistory((prev) => !prev)}
            className="text-xs shrink-0"
          >
            {showAllHistory ? 'Show standard range' : 'Show all history'}
          </Button>
        </CardHeader>
        <CardContent>
          {!schedule || schedule.occurrences.length === 0 ? (
            <div className="text-center py-8 text-sm text-slate-500 border border-dashed rounded-lg">
              No fee occurrences calculated.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b text-xs uppercase text-slate-500 font-semibold bg-slate-50/50 dark:bg-slate-900/50">
                      <th className="py-3 px-4">Fee Year</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Fee Amount</th>
                      <th className="py-3 px-4">Waiver Progress</th>
                      <th className="py-3 px-4">Net Cost</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {schedule.occurrences.map((occ, idx) => {
                      const meta = FEE_STATUS_META[occ.status];
                      return (
                        <tr
                          key={idx}
                          className="hover:bg-slate-50/50 dark:hover:bg-slate-900/50 transition-colors"
                        >
                          <td className="py-3 px-4">
                            <div className="font-medium text-slate-900 dark:text-slate-100">
                              {occ.feeYearStart} → {occ.feeYearEnd}
                            </div>
                            <div className="text-xs text-slate-500">
                              Due: {occ.dueDate}
                            </div>
                          </td>
                          <td className="py-3 px-4">
                            <span
                              className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${meta.badgeClass}`}
                            >
                              {meta.label}
                            </span>
                          </td>
                          <td className="py-3 px-4">
                            {occ.kind === CardFeeKind.LTF ? (
                              <span className="text-slate-400">₹0 (LTF)</span>
                            ) : (
                              <span>
                                ₹{(occ.totalAmount || 0).toLocaleString('en-IN')}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            {occ.waiverSpendThreshold ? (
                              <div className="space-y-1">
                                <div className="text-xs font-medium">
                                  ₹
                                  {(occ.spendConsidered || 0).toLocaleString(
                                    'en-IN',
                                  )}{' '}
                                  /{' '}
                                  ₹
                                  {occ.waiverSpendThreshold.toLocaleString(
                                    'en-IN',
                                  )}
                                </div>
                                <div className="w-24 bg-slate-200 dark:bg-slate-700 h-1.5 rounded-full overflow-hidden">
                                  <div
                                    className="bg-emerald-500 h-full transition-all"
                                    style={{
                                      width: `${Math.min(
                                        100,
                                        ((occ.spendConsidered || 0) /
                                          occ.waiverSpendThreshold) *
                                          100,
                                      )}%`,
                                    }}
                                  />
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-semibold text-slate-900 dark:text-slate-100">
                            ₹{occ.netAmount.toLocaleString('en-IN')}
                          </td>
                          <td className="py-3 px-4 text-right">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => openOverrideModal(occ)}
                              className="gap-1 text-xs"
                            >
                              <Pencil className="h-3.5 w-3.5" /> Override / Link
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Term Form Modal */}
      <Dialog open={isTermModalOpen} onOpenChange={setIsTermModalOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingTerm ? 'Edit Fee Term' : 'Add Fee Term'}
            </DialogTitle>
            <DialogDescription>
              Configure fee rules for this credit card starting on an effective
              date.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div>
              <Label>Kind</Label>
              <Select
                value={termKind}
                onValueChange={(val) => setTermKind(val as CardFeeKind)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={CardFeeKind.ANNUAL_FEE}>
                    Annual Fee
                  </SelectItem>
                  <SelectItem value={CardFeeKind.JOINING_FEE}>
                    Joining Fee
                  </SelectItem>
                  <SelectItem value={CardFeeKind.LTF}>
                    Lifetime Free (LTF)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Effective From Date</Label>
              <Input
                type="date"
                value={effectiveFrom}
                onChange={(e) => setEffectiveFrom(e.target.value)}
                className="mt-1"
              />
            </div>

            {termKind !== CardFeeKind.LTF && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Base Amount (₹, ex. GST)</Label>
                    <Input
                      type="text"
                      placeholder="e.g. 2500"
                      value={amount}
                      onChange={(e) => setAmount(sanitizeDecimalInput(e.target.value))}
                      className="mt-1"
                    />
                  </div>
                  <div>
                    <Label>GST Rate (%)</Label>
                    <Input
                      type="text"
                      placeholder="18"
                      value={gstRate}
                      onChange={(e) => setGstRate(sanitizeDecimalInput(e.target.value))}
                      className="mt-1"
                    />
                  </div>
                </div>

                <div className="text-xs text-slate-500 bg-slate-50 dark:bg-slate-900 p-2 rounded border">
                  Total Charge (inc. GST): ₹
                  {feeAllIn(parseFloat(amount), parseFloat(gstRate)).toLocaleString(
                    'en-IN',
                  )}
                </div>
              </>
            )}

            {termKind === CardFeeKind.ANNUAL_FEE && (
              <>
                <div>
                  <Label>Waiver Spend Threshold (₹, optional)</Label>
                  <Input
                    type="text"
                    placeholder="e.g. 300000"
                    value={waiverThreshold}
                    onChange={(e) =>
                      setWaiverThreshold(sanitizeDecimalInput(e.target.value))
                    }
                    className="mt-1"
                  />
                </div>

                {waiverThreshold && (
                  <div>
                    <Label>Waiver Basis</Label>
                    <Select
                      value={waiverBasis}
                      onValueChange={(val) =>
                        setWaiverBasis(val as FeeWaiverBasis)
                      }
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={FeeWaiverBasis.PRECEDING_FEE_YEAR}>
                          Preceding fee year spend
                        </SelectItem>
                        <SelectItem value={FeeWaiverBasis.SAME_FEE_YEAR}>
                          Same fee year spend
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </>
            )}

            <div>
              <Label>Note (optional)</Label>
              <Input
                type="text"
                placeholder="e.g. Card fee structure revision"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsTermModalOpen(false)}
            >
              Cancel
            </Button>
            <Button onClick={handleSaveTerm} disabled={isSubmittingTerm}>
              {isSubmittingTerm ? 'Saving...' : 'Save Term'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Override Modal */}
      <Dialog open={isOverrideModalOpen} onOpenChange={setIsOverrideModalOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Override Fee / Link Transaction</DialogTitle>
            <DialogDescription>
              Record an issuer waiver or link posted fee transactions for fee year{' '}
              {activeOccurrence?.feeYearStart}.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div>
              <Label>Waiver Status</Label>
              <Select
                value={waivedMode}
                onValueChange={(val) =>
                  setWaivedMode(val as 'AUTO' | 'WAIVED' | 'CHARGED')
                }
              >
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="AUTO">Auto-evaluate (derived)</SelectItem>
                  <SelectItem value="WAIVED">
                    Manually Waived (₹0 cost)
                  </SelectItem>
                  <SelectItem value="CHARGED">
                    Manually Charged / Custom Amount
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {waivedMode === 'CHARGED' && (
              <div>
                <Label>Override Net Amount (₹, inc. GST)</Label>
                <Input
                  type="text"
                  placeholder="e.g. 1000"
                  value={overrideAmountInput}
                  onChange={(e) =>
                    setOverrideAmountInput(sanitizeDecimalInput(e.target.value))
                  }
                  className="mt-1"
                />
              </div>
            )}

            <div>
              <Label className="text-xs font-semibold text-slate-500 uppercase">
                Link Posted Fee Transaction
              </Label>
              <p className="text-xs text-slate-500 mb-2">
                Select transactions near due date. Linked fee transactions earn 0
                rewards and are excluded from analytics basis.
              </p>

              {isLoadingCandidates ? (
                <div className="text-xs text-slate-400 py-4 text-center">
                  Loading candidate transactions...
                </div>
              ) : candidates.length === 0 ? (
                <div className="text-xs text-slate-400 py-4 text-center border rounded">
                  No candidate transactions found within ±20 days.
                </div>
              ) : (
                <div className="max-h-40 overflow-y-auto divide-y border rounded text-xs">
                  {candidates.map((cand) => {
                    const isSelected = selectedTxnIds.includes(
                      cand.transactionId,
                    );
                    return (
                      <div
                        key={cand.transactionId}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedTxnIds(
                              selectedTxnIds.filter(
                                (id) => id !== cand.transactionId,
                              ),
                            );
                          } else {
                            setSelectedTxnIds([
                              ...selectedTxnIds,
                              cand.transactionId,
                            ]);
                          }
                        }}
                        className={`p-2 flex items-center justify-between cursor-pointer transition-colors ${
                          isSelected
                            ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-900 dark:text-emerald-200'
                            : 'hover:bg-slate-50 dark:hover:bg-slate-900'
                        }`}
                      >
                        <div>
                          <div className="font-medium">
                            {cand.date} • {cand.description}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {cand.type} • ₹{cand.amount.toLocaleString('en-IN')}
                          </div>
                        </div>
                        {isSelected && (
                          <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            <div>
              <Label>Note (optional)</Label>
              <Input
                type="text"
                placeholder="e.g. Retained via support call"
                value={overrideNote}
                onChange={(e) => setOverrideNote(e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          <DialogFooter className="flex items-center justify-between sm:justify-between">
            <Button
              variant="ghost"
              className="text-rose-500 hover:text-rose-600"
              onClick={handleClearOverride}
              disabled={isSubmittingOverride}
            >
              Clear Override
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => setIsOverrideModalOpen(false)}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSaveOverride}
                disabled={isSubmittingOverride}
              >
                {isSubmittingOverride ? 'Saving...' : 'Save Override'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

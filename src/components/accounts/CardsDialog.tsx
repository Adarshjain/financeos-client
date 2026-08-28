'use client';

import {
  AlertCircle,
  ArrowLeftRight,
  CreditCard,
  Edit2,
  Loader2,
  Plus,
  Trash2,
  User,
  XCircle,
} from 'lucide-react';
import { JSX, useCallback, useState } from 'react';
import { toast } from 'sonner';

import {
  closeAccountCard,
  createAccountCard,
  deleteAccountCard,
  listAccountCards,
  updateAccountCard,
} from '@/actions/accountCards';
import { bulkReattributeTransactionsCard } from '@/actions/transactions';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Account,
  AccountCard,
  CardRelationship,
  CreateAccountCardRequest,
  UpdateAccountCardRequest,
} from '@/lib/account.types';
import { cn, formatDate, formatMoney } from '@/lib/utils';

interface CardsDialogProps {
  account: Account;
  trigger: JSX.Element;
}

const RELATIONSHIP_LABELS: Record<CardRelationship, string> = {
  SELF: 'Self (Primary)',
  SPOUSE: 'Spouse',
  PARENT: 'Parent',
  CHILD: 'Child',
  SIBLING: 'Sibling',
  OTHER: 'Other',
};

export function CardsDialog({ account, trigger }: CardsDialogProps) {
  const [open, setOpen] = useState(false);
  const [cards, setCards] = useState<AccountCard[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Add / Edit form state
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<AccountCard | null>(null);
  const [label, setLabel] = useState('');
  const [holderName, setHolderName] = useState('');
  const [relationship, setRelationship] = useState<CardRelationship>('SPOUSE');
  const [last4, setLast4] = useState('');
  const [issuedOn, setIssuedOn] = useState('');
  const [spendLimit, setSpendLimit] = useState('');
  const [note, setNote] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Close Card modal / inline
  const [closingCard, setClosingCard] = useState<AccountCard | null>(null);
  const [closedOn, setClosedOn] = useState('');
  const [isClosing, setIsClosing] = useState(false);

  // Delete Card state
  const [deletingCardId, setDeletingCardId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Reassign transactions modal state
  const [reattributingCard, setReattributingCard] = useState<AccountCard | null>(null);
  const [reattributeFrom, setReattributeFrom] = useState('');
  const [reattributeTo, setReattributeTo] = useState('');
  const [reattributeSource, setReattributeSource] = useState<string>('UNATTRIBUTED');
  const [isReattributing, setIsReattributing] = useState(false);
  const [reattributeError, setReattributeError] = useState<string | null>(null);

  const loadCards = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const res = await listAccountCards(account.id);
    if (res.success && res.data) {
      setCards(res.data);
    } else if (!res.success) {
      setError(res.error.message || 'Failed to load cards');
    }
    setIsLoading(false);
  }, [account.id]);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      loadCards();
      setIsFormOpen(false);
      setEditingCard(null);
      setClosingCard(null);
      setReattributingCard(null);
    }
  };

  const resetForm = () => {
    setEditingCard(null);
    setLabel('');
    setHolderName('');
    setRelationship('SPOUSE');
    setLast4('');
    setIssuedOn('');
    setSpendLimit('');
    setNote('');
    setFormError(null);
    setIsFormOpen(false);
  };

  const handleStartAdd = () => {
    resetForm();
    setIsFormOpen(true);
  };

  const handleStartEdit = (card: AccountCard) => {
    setEditingCard(card);
    setLabel(card.label || '');
    setHolderName(card.holderName || '');
    setRelationship(card.relationship);
    setLast4(card.last4);
    setIssuedOn(card.issuedOn || '');
    setSpendLimit(card.spendLimit ? String(card.spendLimit) : '');
    setNote(card.note || '');
    setFormError(null);
    setIsFormOpen(true);
  };

  const handleSaveCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!last4 || last4.length !== 4 || !/^\d{4}$/.test(last4)) {
      setFormError('Last 4 digits must be exactly 4 numeric digits');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    const parsedLimit = spendLimit ? Number(spendLimit) : null;

    if (editingCard) {
      const updateData: UpdateAccountCardRequest = {
        label: label.trim() || undefined,
        holderName: holderName.trim() || undefined,
        relationship,
        last4,
        isPrimary: editingCard.isPrimary,
        issuedOn: issuedOn || null,
        spendLimit: parsedLimit,
        note: note.trim() || null,
      };

      const res = await updateAccountCard(account.id, editingCard.id, updateData);
      if (res.success) {
        resetForm();
        loadCards();
      } else {
        setFormError(res.error.message || 'Failed to update card');
      }
    } else {
      const createData: CreateAccountCardRequest = {
        label: label.trim() || undefined,
        holderName: holderName.trim() || undefined,
        relationship,
        last4,
        isPrimary: false,
        issuedOn: issuedOn || null,
        spendLimit: parsedLimit,
        note: note.trim() || null,
      };

      const res = await createAccountCard(account.id, createData);
      if (res.success) {
        resetForm();
        loadCards();
      } else {
        setFormError(res.error.message || 'Failed to add card');
      }
    }
    setIsSubmitting(false);
  };

  const handleStartClose = (card: AccountCard) => {
    setClosingCard(card);
    setClosedOn(new Date().toISOString().split('T')[0]);
  };

  const handleConfirmClose = async () => {
    if (!closingCard) return;
    setIsClosing(true);
    const res = await closeAccountCard(account.id, closingCard.id, {
      closedOn: closedOn || undefined,
    });
    if (res.success) {
      setClosingCard(null);
      loadCards();
    } else {
      setError(res.error.message || 'Failed to close card');
    }
    setIsClosing(false);
  };

  const handleBulkReattribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reattributingCard) return;
    setIsReattributing(true);
    setReattributeError(null);

    const res = await bulkReattributeTransactionsCard({
      accountId: account.id,
      cardId: reattributingCard.id,
      from: reattributeFrom || undefined,
      to: reattributeTo || undefined,
      currentCardId: reattributeSource === 'ALL' ? undefined : (reattributeSource === 'UNATTRIBUTED' ? undefined : reattributeSource),
    });

    if (res.success && res.data) {
      toast.success(`Reassigned ${res.data.updatedCount} transaction${res.data.updatedCount === 1 ? '' : 's'} to ${reattributingCard.label || `•••• ${reattributingCard.last4}`}`);
      setReattributingCard(null);
      loadCards();
    } else if (!res.success) {
      setReattributeError(res.error.message || 'Failed to reassign transactions');
    }
    setIsReattributing(false);
  };

  const handleDeleteCard = async (card: AccountCard) => {
    if (!confirm(`Are you sure you want to delete card •••• ${card.last4}?`)) {
      return;
    }
    setDeletingCardId(card.id);
    setIsDeleting(true);
    const res = await deleteAccountCard(account.id, card.id);
    if (res.success) {
      loadCards();
    } else {
      setError(res.error.message || 'Failed to delete card');
    }
    setIsDeleting(false);
    setDeletingCardId(null);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between pb-2 border-b border-slate-100 dark:border-slate-800">
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <CreditCard className="w-5 h-5 text-amber-500" />
            Cards — {account.name}
          </DialogTitle>
          {!isFormOpen && (
            <Button size="sm" onClick={handleStartAdd} className="gap-1.5 shrink-0">
              <Plus className="w-4 h-4" />
              Add Supplementary Card
            </Button>
          )}
        </DialogHeader>

        <DialogBody className="space-y-4 pt-2">
          {error && (
            <div className="p-3 text-xs bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300 rounded-lg flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Inline Add / Edit Form */}
          {isFormOpen && (
            <form onSubmit={handleSaveCard} className="bg-slate-50 dark:bg-slate-900/80 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
              <div className="flex justify-between items-center pb-2 border-b border-slate-200 dark:border-slate-800">
                <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
                  {editingCard ? `Edit Card (•••• ${editingCard.last4})` : 'New Supplementary Card'}
                </h3>
                <Button type="button" variant="ghost" size="sm" onClick={resetForm}>
                  Cancel
                </Button>
              </div>

              {formError && (
                <div className="p-2.5 text-xs bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="card-last4" className="text-xs">
                    Last 4 Digits *
                  </Label>
                  <Input
                    id="card-last4"
                    maxLength={4}
                    placeholder="1234"
                    value={last4}
                    onChange={(e) => setLast4(e.target.value.replace(/\D/g, ''))}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="card-relationship" className="text-xs">
                    Relationship *
                  </Label>
                  <Select
                    value={relationship}
                    onValueChange={(val) => setRelationship(val as CardRelationship)}
                    disabled={editingCard?.isPrimary}
                  >
                    <SelectTrigger id="card-relationship">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(RELATIONSHIP_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>
                          {v}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="card-holder" className="text-xs">
                    Cardholder Name
                  </Label>
                  <Input
                    id="card-holder"
                    placeholder="e.g. Jane Doe"
                    value={holderName}
                    onChange={(e) => setHolderName(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="card-label" className="text-xs">
                    Label / Nickname
                  </Label>
                  <Input
                    id="card-label"
                    placeholder="e.g. Spouse Dining Card"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="card-issued" className="text-xs">
                    Issued Date
                  </Label>
                  <Input
                    id="card-issued"
                    type="date"
                    value={issuedOn}
                    onChange={(e) => setIssuedOn(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="card-limit" className="text-xs">
                    Sub-Spend Limit (₹)
                  </Label>
                  <Input
                    id="card-limit"
                    type="number"
                    min="0"
                    placeholder="Optional sub-limit"
                    value={spendLimit}
                    onChange={(e) => setSpendLimit(e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-1">
                <Label htmlFor="card-note" className="text-xs">
                  Notes
                </Label>
                <Input
                  id="card-note"
                  placeholder="Optional internal note"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={resetForm}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                      Saving...
                    </>
                  ) : editingCard ? (
                    'Update Card'
                  ) : (
                    'Add Card'
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* Close Card Prompt */}
          {closingCard && (
            <div className="p-3 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-amber-800 dark:text-amber-300">
                  Close Card •••• {closingCard.last4} ({closingCard.label || closingCard.holderName || 'Supplementary'})
                </span>
                <Button variant="ghost" size="sm" onClick={() => setClosingCard(null)}>
                  Cancel
                </Button>
              </div>
              <div className="flex items-center gap-3">
                <div className="space-y-1 flex-1">
                  <Label htmlFor="close-date" className="text-xs">
                    Closed On Date
                  </Label>
                  <Input
                    id="close-date"
                    type="date"
                    value={closedOn}
                    onChange={(e) => setClosedOn(e.target.value)}
                  />
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  className="mt-5"
                  disabled={isClosing}
                  onClick={handleConfirmClose}
                >
                  {isClosing ? 'Closing...' : 'Confirm Close'}
                </Button>
              </div>
            </div>
          )}

          {/* Cards List */}
          {isLoading ? (
            <div className="py-12 flex justify-center items-center text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin" />
            </div>
          ) : cards.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-400 border border-dashed rounded-xl">
              No cards registered for this account.
            </div>
          ) : (
            <>
              {/* Mobile Cards View */}
              <div className="md:hidden space-y-3">
                {cards.map((c) => (
                  <div
                    key={c.id}
                    className={cn(
                      'p-3.5 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 space-y-2.5 shadow-2xs',
                      c.closedOn && 'opacity-65 bg-slate-50/50 dark:bg-slate-950/20'
                    )}
                  >
                    {/* Top Row: Card number, Primary/Closed badge, Relationship */}
                    <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                          •••• {c.last4}
                        </span>
                        {c.isPrimary ? (
                          <Badge variant="default" className="text-2xs py-0 px-1.5 font-bold">
                            PRIMARY
                          </Badge>
                        ) : c.closedOn ? (
                          <Badge variant="destructive" className="text-2xs py-0 px-1.5 font-bold">
                            CLOSED
                          </Badge>
                        ) : null}
                      </div>
                      <Badge variant="outline" className="text-2xs py-0 px-1.5">
                        {RELATIONSHIP_LABELS[c.relationship] || c.relationship}
                      </Badge>
                    </div>

                    {/* Card Title / Cardholder */}
                    <div>
                      <div className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                        {c.label || c.holderName || (c.isPrimary ? 'Primary Card' : 'Add-on Card')}
                      </div>
                      {c.holderName && c.label && (
                        <div className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                          <User className="w-3 h-3" />
                          <span>{c.holderName}</span>
                        </div>
                      )}
                    </div>

                    {/* Metrics Grid */}
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-2xs text-slate-400 dark:text-slate-500 block">Spend Limit</span>
                        <span className="tabular-nums font-medium text-slate-700 dark:text-slate-300">
                          {c.spendLimit ? formatMoney(c.spendLimit) : 'No limit'}
                        </span>
                      </div>
                      <div>
                        <span className="text-2xs text-slate-400 dark:text-slate-500 block">Activity</span>
                        <span className="tabular-nums font-medium text-slate-700 dark:text-slate-300">
                          {c.transactionCount ?? 0} {c.transactionCount === 1 ? 'transaction' : 'transactions'}
                        </span>
                      </div>
                      {c.issuedOn && (
                        <div>
                          <span className="text-2xs text-slate-400 dark:text-slate-500 block">Issued</span>
                          <span className="text-slate-700 dark:text-slate-300">{formatDate(c.issuedOn)}</span>
                        </div>
                      )}
                      {c.closedOn && (
                        <div>
                          <span className="text-2xs text-rose-400 block">Closed</span>
                          <span className="text-rose-500 font-medium">{formatDate(c.closedOn)}</span>
                        </div>
                      )}
                    </div>

                    {/* Named Action Buttons */}
                    <div className="pt-2 border-t border-slate-100 dark:border-slate-800/80 flex flex-wrap items-center gap-1.5">
                      {!c.closedOn && (
                        <Button
                          variant="outline"
                          size="xs"
                          className="gap-1 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-800/80 hover:bg-sky-50 dark:hover:bg-sky-950/30"
                          onClick={() => {
                            setReattributingCard(c);
                            setReattributeFrom('');
                            setReattributeTo('');
                            setReattributeSource('UNATTRIBUTED');
                            setReattributeError(null);
                          }}
                        >
                          <ArrowLeftRight className="w-3 h-3" />
                          Reassign
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="xs"
                        className="gap-1"
                        onClick={() => handleStartEdit(c)}
                      >
                        <Edit2 className="w-3 h-3" />
                        Edit
                      </Button>
                      {!c.isPrimary && !c.closedOn && (
                        <Button
                          variant="outline"
                          size="xs"
                          className="gap-1 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/80 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                          onClick={() => handleStartClose(c)}
                        >
                          <XCircle className="w-3 h-3" />
                          Close
                        </Button>
                      )}
                      {!c.isPrimary && (
                        <Button
                          variant="outline"
                          size="xs"
                          className="gap-1 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800/80 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                          disabled={isDeleting && deletingCardId === c.id}
                          onClick={() => handleDeleteCard(c)}
                        >
                          <Trash2 className="w-3 h-3" />
                          Delete
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table View */}
              <div className="hidden md:block border border-slate-100 dark:border-slate-800 rounded-xl overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[100px]">Card</TableHead>
                      <TableHead>Label / Holder</TableHead>
                      <TableHead>Relationship</TableHead>
                      <TableHead>Dates</TableHead>
                      <TableHead className="text-right">Spend Limit</TableHead>
                      <TableHead className="text-right">Txns</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {cards.map((c) => (
                      <TableRow key={c.id} className={c.closedOn ? 'opacity-60 bg-slate-50/50 dark:bg-slate-950/20' : ''}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-mono font-bold">•••• {c.last4}</span>
                            {c.isPrimary ? (
                              <Badge variant="default" className="text-2xs py-0 px-1.5 font-bold">
                                PRIMARY
                              </Badge>
                            ) : c.closedOn ? (
                              <Badge variant="destructive" className="text-2xs py-0 px-1.5 font-bold">
                                CLOSED
                              </Badge>
                            ) : null}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex flex-col">
                            <span className="text-xs font-medium text-slate-900 dark:text-slate-100">
                              {c.label || c.holderName || (c.isPrimary ? 'Primary Card' : 'Add-on Card')}
                            </span>
                            {c.holderName && c.label && (
                              <span className="text-2xs text-slate-400 flex items-center gap-1">
                                <User className="w-2.5 h-2.5" />
                                {c.holderName}
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className="text-2xs py-0 px-1.5">
                            {RELATIONSHIP_LABELS[c.relationship] || c.relationship}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-2xs text-slate-500">
                          {c.issuedOn && (
                            <div className="flex items-center gap-1">
                              <span className="text-slate-400">Issued:</span> {formatDate(c.issuedOn)}
                            </div>
                          )}
                          {c.closedOn && (
                            <div className="flex items-center gap-1 text-rose-500 font-medium">
                              <span>Closed:</span> {formatDate(c.closedOn)}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right text-xs tabular-nums">
                          {c.spendLimit ? formatMoney(c.spendLimit) : '—'}
                        </TableCell>
                        <TableCell className="text-right text-xs tabular-nums font-semibold text-slate-600 dark:text-slate-300">
                          {c.transactionCount ?? 0}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {!c.closedOn && (
                              <Button
                                variant="outline"
                                size="xs"
                                className="h-7 px-2 gap-1 text-sky-600 dark:text-sky-400 border-sky-200 dark:border-sky-800/80 hover:bg-sky-50 dark:hover:bg-sky-950/30"
                                onClick={() => {
                                  setReattributingCard(c);
                                  setReattributeFrom('');
                                  setReattributeTo('');
                                  setReattributeSource('UNATTRIBUTED');
                                  setReattributeError(null);
                                }}
                              >
                                <ArrowLeftRight className="w-3 h-3" />
                                Reassign
                              </Button>
                            )}
                            <Button
                              variant="outline"
                              size="xs"
                              className="h-7 px-2 gap-1"
                              onClick={() => handleStartEdit(c)}
                            >
                              <Edit2 className="w-3 h-3" />
                              Edit
                            </Button>
                            {!c.isPrimary && !c.closedOn && (
                              <Button
                                variant="outline"
                                size="xs"
                                className="h-7 px-2 gap-1 text-amber-600 dark:text-amber-400 border-amber-200 dark:border-amber-800/80 hover:bg-amber-50 dark:hover:bg-amber-950/30"
                                onClick={() => handleStartClose(c)}
                              >
                                <XCircle className="w-3 h-3" />
                                Close
                              </Button>
                            )}
                            {!c.isPrimary && (
                              <Button
                                variant="outline"
                                size="xs"
                                className="h-7 px-2 gap-1 text-rose-600 dark:text-rose-400 border-rose-200 dark:border-rose-800/80 hover:bg-rose-50 dark:hover:bg-rose-950/30"
                                disabled={isDeleting && deletingCardId === c.id}
                                onClick={() => handleDeleteCard(c)}
                              >
                                <Trash2 className="w-3 h-3" />
                                Delete
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </>
          )}

          {/* Reassign Transactions Sub-Dialog */}
          {reattributingCard && (
            <Dialog open={true} onOpenChange={(o) => !o && setReattributingCard(null)}>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle className="text-base font-bold flex items-center gap-2">
                    <ArrowLeftRight className="w-4 h-4 text-sky-500" />
                    Reassign Transactions to {reattributingCard.label || `•••• ${reattributingCard.last4}`}
                  </DialogTitle>
                </DialogHeader>
                <DialogBody>
                  <form onSubmit={handleBulkReattribute} className="space-y-3.5">
                    {reattributeError && (
                      <div className="p-2.5 text-xs bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300 rounded-lg flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 shrink-0" />
                        <span>{reattributeError}</span>
                      </div>
                    )}
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1">
                        <Label className="text-xs">From Date</Label>
                        <Input
                          type="date"
                          value={reattributeFrom}
                          onChange={(e) => setReattributeFrom(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">To Date</Label>
                        <Input
                          type="date"
                          value={reattributeTo}
                          onChange={(e) => setReattributeTo(e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Reassign from</Label>
                      <Select
                        value={reattributeSource}
                        onValueChange={setReattributeSource}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="UNATTRIBUTED">Unassigned transactions only</SelectItem>
                          <SelectItem value="ALL">All transactions in range</SelectItem>
                          {cards.filter((other) => other.id !== reattributingCard.id).map((other) => (
                            <SelectItem key={other.id} value={other.id}>
                              From {other.label || `•••• ${other.last4}`}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setReattributingCard(null)}
                        disabled={isReattributing}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="submit"
                        size="sm"
                        disabled={isReattributing}
                        className="gap-1.5"
                      >
                        {isReattributing && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                        Reassign Transactions
                      </Button>
                    </div>
                  </form>
                </DialogBody>
              </DialogContent>
            </Dialog>
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

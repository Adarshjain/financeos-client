'use client';

import {
  AlertCircle,
  ArrowLeft,
  ArrowLeftRight,
  CreditCard,
  Edit2,
  History,
  Loader2,
  Plus,
  RotateCcw,
  ShieldAlert,
  Trash2,
  User,
  XCircle,
} from 'lucide-react';
import { JSX, useCallback, useState } from 'react';
import { toast } from 'sonner';

import {
  addAddonCardholder,
  addCard,
  closeCard,
  closeCardholder,
  deleteCard,
  deleteCardholder,
  listCardholders,
  reopenCardholder,
  replaceCard,
  updateCardholder,
} from '@/actions/cardholders';
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
  Card,
  Cardholder,
  CardholderRelationship,
  CreateCardholderRequest,
  CreateCardRequest,
  isCardholderClosed,
  ReplaceCardRequest,
  UpdateCardholderRequest,
} from '@/lib/account.types';
import { cn, formatDate, formatMoney } from '@/lib/utils';

interface CardsDialogProps {
  account: Account;
  trigger: JSX.Element;
}

const RELATIONSHIP_LABELS: Record<CardholderRelationship, string> = {
  SELF: 'Self (Primary)',
  SPOUSE: 'Spouse',
  CHILD: 'Child',
  PARENT: 'Parent',
  SIBLING: 'Sibling',
  FRIEND: 'Friend',
  OTHER: 'Other',
};

type ViewState =
  | 'list'
  | 'addAddon'
  | 'editCardholder'
  | 'closeCardholder'
  | 'issueCard'
  | 'replaceCard'
  | 'closeCard'
  | 'reassign';

export function CardsDialog({ account, trigger }: CardsDialogProps) {
  const [open, setOpen] = useState(false);
  const [cardholders, setCardholders] = useState<Cardholder[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Active subview
  const [view, setView] = useState<ViewState>('list');
  const [targetCardholder, setTargetCardholder] = useState<Cardholder | null>(null);
  const [targetCard, setTargetCard] = useState<Card | null>(null);

  // Form states
  const [personName, setPersonName] = useState('');
  const [relationship, setRelationship] = useState<CardholderRelationship>('SPOUSE');
  const [spendLimit, setSpendLimit] = useState('');
  const [cardLast4, setCardLast4] = useState('');
  const [openedOn, setOpenedOn] = useState('');
  const [issuedOn, setIssuedOn] = useState('');
  const [closeDate, setCloseDate] = useState('');
  const [replaceNewLast4, setReplaceNewLast4] = useState('');
  const [replaceIssuedOn, setReplaceIssuedOn] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Reassign transactions form state
  const [reattributeFrom, setReattributeFrom] = useState('');
  const [reattributeTo, setReattributeTo] = useState('');
  const [reattributeSource, setReattributeSource] = useState<string>('UNATTRIBUTED');
  const [isReattributing, setIsReattributing] = useState(false);
  const [reattributeError, setReattributeError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    const res = await listCardholders(account.id);
    if (res.success && res.data) {
      setCardholders(res.data);
    } else if (!res.success) {
      setError(res.error.message || 'Failed to load cardholders');
    }
    setIsLoading(false);
  }, [account.id]);

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      loadData();
      backToList();
    }
  };

  const backToList = () => {
    setView('list');
    setTargetCardholder(null);
    setTargetCard(null);
    setPersonName('');
    setRelationship('SPOUSE');
    setSpendLimit('');
    setCardLast4('');
    setOpenedOn('');
    setIssuedOn('');
    setCloseDate('');
    setReplaceNewLast4('');
    setReplaceIssuedOn('');
    setFormError(null);
    setReattributeError(null);
  };

  // Handlers for starting sub-views
  const startAddAddon = () => {
    setView('addAddon');
    setPersonName('');
    setRelationship('SPOUSE');
    setSpendLimit('');
    setCardLast4('');
    setOpenedOn(new Date().toISOString().split('T')[0]);
    setIssuedOn(new Date().toISOString().split('T')[0]);
    setFormError(null);
  };

  const startEditCardholder = (ch: Cardholder) => {
    setTargetCardholder(ch);
    setPersonName(ch.personName || '');
    setRelationship(ch.relationship || 'OTHER');
    setSpendLimit(ch.spendLimit ? ch.spendLimit.toString() : '');
    setFormError(null);
    setView('editCardholder');
  };

  const startCloseCardholder = (ch: Cardholder) => {
    setTargetCardholder(ch);
    setCloseDate(new Date().toISOString().split('T')[0]);
    setFormError(null);
    setView('closeCardholder');
  };

  const startIssueCard = (ch: Cardholder) => {
    setTargetCardholder(ch);
    setCardLast4('');
    setIssuedOn(new Date().toISOString().split('T')[0]);
    setFormError(null);
    setView('issueCard');
  };

  const startReplaceCard = (ch: Cardholder, card: Card) => {
    setTargetCardholder(ch);
    setTargetCard(card);
    setReplaceNewLast4('');
    setReplaceIssuedOn(new Date().toISOString().split('T')[0]);
    setFormError(null);
    setView('replaceCard');
  };

  const startCloseCard = (ch: Cardholder, card: Card) => {
    setTargetCardholder(ch);
    setTargetCard(card);
    setCloseDate(new Date().toISOString().split('T')[0]);
    setFormError(null);
    setView('closeCard');
  };

  const startReassign = (ch: Cardholder, card?: Card) => {
    setTargetCardholder(ch);
    setTargetCard(card || null);
    setReattributeFrom('');
    setReattributeTo('');
    setReattributeSource('UNATTRIBUTED');
    setReattributeError(null);
    setView('reassign');
  };

  // Submit Actions
  const handleSaveAddon = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!personName.trim()) {
      setFormError('Cardholder name is required.');
      return;
    }
    if (cardLast4 && cardLast4.length !== 4) {
      setFormError('Card last 4 digits must be exactly 4 digits.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    const payload: CreateCardholderRequest = {
      personName: personName.trim(),
      relationship,
      spendLimit: spendLimit ? parseFloat(spendLimit) : null,
      last4: cardLast4.trim() || undefined,
      openedOn: openedOn || undefined,
      issuedOn: cardLast4 ? (issuedOn || openedOn || undefined) : undefined,
    };

    const res = await addAddonCardholder(account.id, payload);
    if (res.success) {
      toast.success('Add-on cardholder created');
      await loadData();
      backToList();
    } else {
      setFormError(res.error.message || 'Failed to create add-on cardholder');
    }
    setIsSubmitting(false);
  };

  const handleSaveEditCardholder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetCardholder) return;

    setIsSubmitting(true);
    setFormError(null);

    const payload: UpdateCardholderRequest = {
      personName: personName.trim() || undefined,
      relationship: targetCardholder.role === 'PRIMARY' ? 'SELF' : relationship,
      spendLimit: spendLimit ? parseFloat(spendLimit) : null,
    };

    const res = await updateCardholder(account.id, targetCardholder.id, payload);
    if (res.success) {
      toast.success('Cardholder updated');
      await loadData();
      backToList();
    } else {
      setFormError(res.error.message || 'Failed to update cardholder');
    }
    setIsSubmitting(false);
  };

  const handleConfirmCloseCardholder = async () => {
    if (!targetCardholder) return;
    setIsSubmitting(true);
    const res = await closeCardholder(account.id, targetCardholder.id, { closedOn: closeDate || undefined });
    if (res.success) {
      toast.success('Cardholder closed');
      await loadData();
      backToList();
    } else {
      setFormError(res.error.message || 'Failed to close cardholder');
    }
    setIsSubmitting(false);
  };

  const handleReopenCardholder = async (ch: Cardholder) => {
    setIsLoading(true);
    const res = await reopenCardholder(account.id, ch.id);
    if (res.success) {
      toast.success('Cardholder reopened');
      await loadData();
    } else {
      toast.error(res.error.message || 'Failed to reopen cardholder');
    }
    setIsLoading(false);
  };

  const handleDeleteCardholder = async (ch: Cardholder) => {
    if (!confirm(`Are you sure you want to delete cardholder ${ch.personName || ch.role}? This cannot be undone.`)) {
      return;
    }
    setIsLoading(true);
    const res = await deleteCardholder(account.id, ch.id);
    if (res.success) {
      toast.success('Cardholder deleted');
      await loadData();
    } else {
      toast.error(res.error.message || 'Failed to delete cardholder');
    }
    setIsLoading(false);
  };

  const handleSaveIssueCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetCardholder) return;
    if (!cardLast4 || cardLast4.length !== 4) {
      setFormError('Last 4 digits must be exactly 4 digits.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    const payload: CreateCardRequest = {
      last4: cardLast4.trim(),
      issuedOn: issuedOn || undefined,
    };

    const res = await addCard(account.id, targetCardholder.id, payload);
    if (res.success) {
      toast.success('New card issued');
      await loadData();
      backToList();
    } else {
      setFormError(res.error.message || 'Failed to issue card');
    }
    setIsSubmitting(false);
  };

  const handleSaveReplaceCard = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetCardholder || !targetCard) return;
    if (!replaceNewLast4 || replaceNewLast4.length !== 4) {
      setFormError('New last 4 digits must be exactly 4 digits.');
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    const payload: ReplaceCardRequest = {
      newLast4: replaceNewLast4.trim(),
      issuedOn: replaceIssuedOn || undefined,
    };

    const res = await replaceCard(account.id, targetCardholder.id, targetCard.id, payload);
    if (res.success) {
      toast.success('Card replaced successfully');
      await loadData();
      backToList();
    } else {
      setFormError(res.error.message || 'Failed to replace card');
    }
    setIsSubmitting(false);
  };

  const handleConfirmCloseCard = async () => {
    if (!targetCardholder || !targetCard) return;
    setIsSubmitting(true);
    const res = await closeCard(account.id, targetCardholder.id, targetCard.id, { closedOn: closeDate || undefined });
    if (res.success) {
      toast.success('Card plastic closed');
      await loadData();
      backToList();
    } else {
      setFormError(res.error.message || 'Failed to close card');
    }
    setIsSubmitting(false);
  };

  const handleDeleteCardPlastic = async (ch: Cardholder, card: Card) => {
    if (!confirm(`Are you sure you want to delete card •••• ${card.last4}?`)) {
      return;
    }
    setIsLoading(true);
    const res = await deleteCard(account.id, ch.id, card.id);
    if (res.success) {
      toast.success('Card plastic deleted');
      await loadData();
    } else {
      toast.error(res.error.message || 'Failed to delete card plastic');
    }
    setIsLoading(false);
  };

  const handleConfirmReattribute = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetCardholder) return;

    const openPlastic = (targetCardholder.cards || []).find((c) => !c.closedOn);
    const targetCardId = targetCard?.id || openPlastic?.id;
    if (!targetCardId) {
      setReattributeError('Target cardholder has no valid card to reassign transactions to.');
      return;
    }

    setIsReattributing(true);
    setReattributeError(null);

    const res = await bulkReattributeTransactionsCard({
      accountId: account.id,
      from: reattributeFrom || undefined,
      to: reattributeTo || undefined,
      currentCardId: reattributeSource === 'UNATTRIBUTED' ? null : reattributeSource,
      cardId: targetCardId,
    });

    if (res.success && res.data) {
      toast.success(`Reassigned ${res.data.updatedCount} transaction(s)`);
      await loadData();
      backToList();
    } else if (!res.success) {
      setReattributeError(res.error.message || 'Failed to reassign transactions');
    }
    setIsReattributing(false);
  };

  const viewTitles: Record<ViewState, string> = {
    list: `${account.name} — Cardholders & Plastics`,
    addAddon: 'Add Add-on Cardholder',
    editCardholder: targetCardholder ? `Edit ${targetCardholder.personName || targetCardholder.role}` : 'Edit Cardholder',
    closeCardholder: targetCardholder ? `Close Cardholder (${targetCardholder.personName || targetCardholder.role})` : 'Close Cardholder',
    issueCard: targetCardholder ? `Issue Plastic Card to ${targetCardholder.personName || targetCardholder.role}` : 'Issue Plastic Card',
    replaceCard: targetCard ? `Replace Card •••• ${targetCard.last4}` : 'Replace Card',
    closeCard: targetCard ? `Close Card •••• ${targetCard.last4}` : 'Close Card',
    reassign: 'Reassign Transactions',
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex flex-row items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
          <DialogTitle className="text-lg font-bold flex items-center gap-2 min-w-0">
            {view === 'list' ? (
              <CreditCard className="w-5 h-5 text-amber-500 shrink-0" />
            ) : (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                onClick={backToList}
                aria-label="Back to cardholders"
                className="shrink-0 -ml-1"
              >
                <ArrowLeft className="w-4 h-4" />
              </Button>
            )}
            <span className="truncate">{viewTitles[view]}</span>
          </DialogTitle>
          {view === 'list' && (
            <Button size="sm" onClick={startAddAddon} className="gap-1.5 shrink-0">
              <Plus className="w-4 h-4" />
              Add-on Cardholder
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

          {/* Form: Add Addon Cardholder */}
          {view === 'addAddon' && (
            <form onSubmit={handleSaveAddon} className="bg-slate-50 dark:bg-slate-900/80 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
              {formError && (
                <div className="p-2.5 text-xs bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="ch-name" className="text-xs">
                    Cardholder Person Name <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="ch-name"
                    placeholder="e.g. Jane Doe"
                    value={personName}
                    onChange={(e) => setPersonName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="ch-rel" className="text-xs">
                    Relationship <span className="text-rose-500">*</span>
                  </Label>
                  <Select value={relationship} onValueChange={(v) => setRelationship(v as CardholderRelationship)}>
                    <SelectTrigger id="ch-rel">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {Object.entries(RELATIONSHIP_LABELS)
                        .filter(([k]) => k !== 'SELF')
                        .map(([k, v]) => (
                          <SelectItem key={k} value={k}>
                            {v}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="ch-limit" className="text-xs">
                    Monthly Spend Limit (₹, optional)
                  </Label>
                  <Input
                    id="ch-limit"
                    type="number"
                    min="0"
                    step="1000"
                    placeholder="e.g. 50000"
                    value={spendLimit}
                    onChange={(e) => setSpendLimit(e.target.value)}
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="ch-opened" className="text-xs">
                    Opened On Date
                  </Label>
                  <Input
                    id="ch-opened"
                    type="date"
                    value={openedOn}
                    onChange={(e) => setOpenedOn(e.target.value)}
                  />
                </div>
              </div>

              <div className="border-t border-slate-200 dark:border-slate-800 pt-3">
                <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 mb-2">
                  Initial Plastic Card (Optional)
                </h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label htmlFor="ch-card-last4" className="text-xs">
                      Last 4 Digits
                    </Label>
                    <Input
                      id="ch-card-last4"
                      maxLength={4}
                      placeholder="e.g. 5678"
                      value={cardLast4}
                      onChange={(e) => setCardLast4(e.target.value.replace(/\D/g, ''))}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="ch-card-issued" className="text-xs">
                      Issued On Date
                    </Label>
                    <Input
                      id="ch-card-issued"
                      type="date"
                      value={issuedOn}
                      onChange={(e) => setIssuedOn(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={backToList}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                      Saving...
                    </>
                  ) : (
                    'Create Add-on Cardholder'
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* Form: Edit Cardholder */}
          {view === 'editCardholder' && targetCardholder && (
            <form onSubmit={handleSaveEditCardholder} className="bg-slate-50 dark:bg-slate-900/80 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
              {formError && (
                <div className="p-2.5 text-xs bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="edit-ch-name" className="text-xs">
                    Cardholder Person Name
                  </Label>
                  <Input
                    id="edit-ch-name"
                    value={personName}
                    onChange={(e) => setPersonName(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <Label htmlFor="edit-ch-rel" className="text-xs">
                    Relationship
                  </Label>
                  <Select
                    value={relationship}
                    onValueChange={(v) => setRelationship(v as CardholderRelationship)}
                    disabled={targetCardholder.role === 'PRIMARY'}
                  >
                    <SelectTrigger id="edit-ch-rel">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {targetCardholder.role === 'PRIMARY' ? (
                        <SelectItem value="SELF">Self (Primary)</SelectItem>
                      ) : (
                        Object.entries(RELATIONSHIP_LABELS)
                          .filter(([k]) => k !== 'SELF')
                          .map(([k, v]) => (
                            <SelectItem key={k} value={k}>
                              {v}
                            </SelectItem>
                          ))
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label htmlFor="edit-ch-limit" className="text-xs">
                    Monthly Spend Limit (₹)
                  </Label>
                  <Input
                    id="edit-ch-limit"
                    type="number"
                    min="0"
                    step="1000"
                    placeholder="e.g. 50000"
                    value={spendLimit}
                    onChange={(e) => setSpendLimit(e.target.value)}
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={backToList}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isSubmitting}>
                  {isSubmitting ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />
                      Saving...
                    </>
                  ) : (
                    'Save Changes'
                  )}
                </Button>
              </div>
            </form>
          )}

          {/* Form: Close Cardholder */}
          {view === 'closeCardholder' && targetCardholder && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                  Close Cardholder Line ({targetCardholder.personName || targetCardholder.role})
                </span>
              </div>
              <p className="text-2xs text-amber-800/80 dark:text-amber-300/80">
                Closing this cardholder line will retire its plastic cards. Past transactions, caps, and milestones remain preserved.
              </p>
              {formError && (
                <div className="p-2 text-xs bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300 rounded-lg">
                  {formError}
                </div>
              )}
              <div className="flex items-center gap-3">
                <div className="space-y-1 flex-1">
                  <Label htmlFor="ch-close-date" className="text-xs">
                    Closed On Date
                  </Label>
                  <Input
                    id="ch-close-date"
                    type="date"
                    value={closeDate}
                    onChange={(e) => setCloseDate(e.target.value)}
                  />
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  className="mt-5 bg-rose-600 hover:bg-rose-700 text-white"
                  disabled={isSubmitting}
                  onClick={handleConfirmCloseCardholder}
                >
                  {isSubmitting ? 'Closing...' : 'Confirm Close Line'}
                </Button>
              </div>
            </div>
          )}

          {/* Form: Issue Card */}
          {view === 'issueCard' && targetCardholder && (
            <form onSubmit={handleSaveIssueCard} className="bg-slate-50 dark:bg-slate-900/80 p-4 rounded-xl border border-slate-200 dark:border-slate-800 space-y-4">
              {formError && (
                <div className="p-2.5 text-xs bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300 rounded-lg flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="issue-last4" className="text-xs">
                    Card Last 4 Digits <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="issue-last4"
                    maxLength={4}
                    placeholder="1234"
                    value={cardLast4}
                    onChange={(e) => setCardLast4(e.target.value.replace(/\D/g, ''))}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="issue-date" className="text-xs">
                    Issued On Date <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="issue-date"
                    type="date"
                    value={issuedOn}
                    onChange={(e) => setIssuedOn(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={backToList}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isSubmitting}>
                  {isSubmitting ? 'Issuing...' : 'Issue Plastic'}
                </Button>
              </div>
            </form>
          )}

          {/* Form: Replace Card */}
          {view === 'replaceCard' && targetCard && (
            <form onSubmit={handleSaveReplaceCard} className="p-4 bg-sky-50 dark:bg-sky-950/40 border border-sky-200 dark:border-sky-800 rounded-xl space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-sky-900 dark:text-sky-200">
                  Replace Card •••• {targetCard.last4} ({targetCardholder?.personName || targetCardholder?.role})
                </span>
              </div>
              <p className="text-2xs text-slate-600 dark:text-slate-400">
                Replaces this physical plastic card. Reward rules, caps, and transaction history remain attached to {targetCardholder?.personName || targetCardholder?.role}.
              </p>
              {formError && (
                <div className="p-2 text-xs bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300 rounded-lg">
                  {formError}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="rep-last4" className="text-xs">
                    New Last 4 Digits <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="rep-last4"
                    maxLength={4}
                    placeholder="5678"
                    value={replaceNewLast4}
                    onChange={(e) => setReplaceNewLast4(e.target.value.replace(/\D/g, ''))}
                    required
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="rep-issued" className="text-xs">
                    New Card Issued Date <span className="text-rose-500">*</span>
                  </Label>
                  <Input
                    id="rep-issued"
                    type="date"
                    value={replaceIssuedOn}
                    onChange={(e) => setReplaceIssuedOn(e.target.value)}
                    required
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={backToList}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isSubmitting}>
                  {isSubmitting ? 'Replacing...' : 'Confirm Replacement'}
                </Button>
              </div>
            </form>
          )}

          {/* Form: Close Card Plastic */}
          {view === 'closeCard' && targetCard && (
            <div className="p-4 bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 rounded-xl space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-amber-900 dark:text-amber-200">
                  Close Card Plastic •••• {targetCard.last4}
                </span>
              </div>
              <p className="text-2xs text-amber-800/80 dark:text-amber-300/80">
                Closes this plastic card number without closing the cardholder line.
              </p>
              {formError && (
                <div className="p-2 text-xs bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300 rounded-lg">
                  {formError}
                </div>
              )}
              <div className="flex items-center gap-3">
                <div className="space-y-1 flex-1">
                  <Label htmlFor="plastic-close-date" className="text-xs">
                    Closed On Date
                  </Label>
                  <Input
                    id="plastic-close-date"
                    type="date"
                    value={closeDate}
                    onChange={(e) => setCloseDate(e.target.value)}
                  />
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  className="mt-5 bg-rose-600 hover:bg-rose-700 text-white"
                  disabled={isSubmitting}
                  onClick={handleConfirmCloseCard}
                >
                  {isSubmitting ? 'Closing...' : 'Confirm Close Plastic'}
                </Button>
              </div>
            </div>
          )}

          {/* Form: Reassign Transactions */}
          {view === 'reassign' && targetCardholder && (
            <form onSubmit={handleConfirmReattribute} className="p-4 bg-slate-50 dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 rounded-xl space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-xs font-semibold text-slate-900 dark:text-slate-100">
                  Reassign Transactions to {targetCardholder.personName || targetCardholder.role}
                </span>
              </div>
              <p className="text-2xs text-slate-500 dark:text-slate-400">
                Move transactions from statement-sourced unattributed rows or another cardholder to this cardholder.
              </p>
              {reattributeError && (
                <div className="p-2 text-xs bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300 rounded-lg">
                  {reattributeError}
                </div>
              )}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label htmlFor="reassign-source" className="text-xs">
                    Source
                  </Label>
                  <Select value={reattributeSource} onValueChange={setReattributeSource}>
                    <SelectTrigger id="reassign-source">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UNATTRIBUTED">Unattributed Transactions</SelectItem>
                      {cardholders
                        .filter((ch) => ch.id !== targetCardholder.id)
                        .flatMap((ch) =>
                          (ch.cards || []).map((c) => (
                            <SelectItem key={c.id} value={c.id}>
                              •••• {c.last4} ({ch.personName || ch.role})
                            </SelectItem>
                          ))
                        )}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label htmlFor="reassign-from" className="text-xs">
                    From Date (optional)
                  </Label>
                  <Input
                    id="reassign-from"
                    type="date"
                    value={reattributeFrom}
                    onChange={(e) => setReattributeFrom(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label htmlFor="reassign-to" className="text-xs">
                    To Date (optional)
                  </Label>
                  <Input
                    id="reassign-to"
                    type="date"
                    value={reattributeTo}
                    onChange={(e) => setReattributeTo(e.target.value)}
                  />
                </div>
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={backToList}>
                  Cancel
                </Button>
                <Button type="submit" size="sm" disabled={isReattributing}>
                  {isReattributing ? 'Reassigning...' : 'Reassign Transactions'}
                </Button>
              </div>
            </form>
          )}

          {/* Cardholders List */}
          {view === 'list' && (
            isLoading ? (
              <div className="py-12 flex justify-center items-center text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin" />
              </div>
            ) : cardholders.length === 0 ? (
              <div className="text-center py-10 text-xs text-slate-400 border border-dashed rounded-xl">
                No cardholders found for this account.
              </div>
            ) : (
              <div className="space-y-4">
                {cardholders.map((ch) => {
                  const isClosed = isCardholderClosed(ch);
                  const openPlastic = (ch.cards || []).find((c) => !c.closedOn);
                  const historicalPlastics = (ch.cards || []).filter((c) => c.closedOn);

                  return (
                    <div
                      key={ch.id}
                      className={cn(
                        'p-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 space-y-3 shadow-2xs transition-colors',
                        isClosed && 'opacity-70 bg-slate-50/50 dark:bg-slate-950/20'
                      )}
                    >
                      {/* Cardholder Header */}
                      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800/80 pb-2.5">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant={ch.role === 'PRIMARY' ? 'default' : 'secondary'}
                            className="text-2xs font-bold"
                          >
                            {ch.role}
                          </Badge>
                          <span className="font-semibold text-sm text-slate-900 dark:text-slate-100">
                            {ch.personName || (ch.role === 'PRIMARY' ? 'Primary Cardholder' : 'Add-on Cardholder')}
                          </span>
                          {ch.relationship && (
                            <Badge variant="outline" className="text-2xs text-slate-600 dark:text-slate-400">
                              {RELATIONSHIP_LABELS[ch.relationship] || ch.relationship}
                            </Badge>
                          )}
                          {isClosed && (
                            <Badge className="text-2xs font-bold bg-rose-100 text-rose-700 dark:bg-rose-950/60 dark:text-rose-300 border-rose-200 dark:border-rose-800">
                              CLOSED
                            </Badge>
                          )}
                        </div>

                        {/* Cardholder Actions */}
                        <div className="flex items-center gap-1">
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => startEditCardholder(ch)}
                            title="Edit Cardholder Details"
                          >
                            <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-xs"
                            onClick={() => startReassign(ch, openPlastic)}
                            title="Reassign Transactions"
                          >
                            <ArrowLeftRight className="w-3.5 h-3.5 text-slate-500" />
                          </Button>
                          {ch.role === 'ADDON' && (
                            <>
                              {isClosed ? (
                                <Button
                                  variant="ghost"
                                  size="icon-xs"
                                  onClick={() => handleReopenCardholder(ch)}
                                  title="Reopen Cardholder Line"
                                >
                                  <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="icon-xs"
                                  onClick={() => startCloseCardholder(ch)}
                                  title="Close Cardholder Line"
                                >
                                  <XCircle className="w-3.5 h-3.5 text-rose-500" />
                                </Button>
                              )}
                              {(ch.transactionCount === 0 || ch.transactionCount === undefined) && (
                                <Button
                                  variant="ghost"
                                  size="icon-xs"
                                  onClick={() => handleDeleteCardholder(ch)}
                                  title="Delete Cardholder"
                                >
                                  <Trash2 className="w-3.5 h-3.5 text-rose-500" />
                                </Button>
                              )}
                            </>
                          )}
                        </div>
                      </div>

                      {/* Cardholder Details & Plastic Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
                        <div>
                          <span className="text-2xs text-slate-400 block">Spend Limit</span>
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            {ch.spendLimit ? formatMoney(ch.spendLimit) : 'Account Limit'}
                          </span>
                        </div>
                        <div>
                          <span className="text-2xs text-slate-400 block">Activity</span>
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            {ch.transactionCount ?? 0} transaction{(ch.transactionCount ?? 0) === 1 ? '' : 's'}
                          </span>
                        </div>
                        <div>
                          <span className="text-2xs text-slate-400 block">Opened On</span>
                          <span className="font-medium text-slate-800 dark:text-slate-200">
                            {formatDate(ch.openedOn)}
                          </span>
                        </div>
                      </div>

                      {/* Active Plastic Section */}
                      <div className="p-3 bg-slate-50/80 dark:bg-slate-800/40 rounded-xl border border-slate-100 dark:border-slate-800 space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-2xs font-semibold uppercase tracking-wider text-slate-500">
                            Physical Plastic
                          </span>
                          {!openPlastic && !isClosed && (
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => startIssueCard(ch)}
                              className="gap-1 h-6 text-2xs"
                            >
                              <Plus className="w-3 h-3" />
                              Issue Plastic
                            </Button>
                          )}
                        </div>

                        {openPlastic ? (
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono font-bold text-slate-900 dark:text-white">
                                •••• {openPlastic.last4}
                              </span>
                              <Badge variant="outline" className="text-2xs text-emerald-600 dark:text-emerald-400 border-emerald-300">
                                ACTIVE
                              </Badge>
                              <span className="text-2xs text-slate-400">
                                Issued: {formatDate(openPlastic.issuedOn)}
                              </span>
                            </div>
                            {!isClosed && (
                              <div className="flex items-center gap-1">
                                <Button
                                  size="xs"
                                  variant="outline"
                                  onClick={() => startReplaceCard(ch, openPlastic)}
                                  className="h-6 text-2xs"
                                >
                                  Replace
                                </Button>
                                <Button
                                  size="xs"
                                  variant="ghost"
                                  onClick={() => startCloseCard(ch, openPlastic)}
                                  className="h-6 text-2xs text-rose-600 hover:text-rose-700"
                                >
                                  Close
                                </Button>
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-2xs text-slate-400 italic">
                            No active plastic card assigned to this cardholder.
                          </div>
                        )}

                        {/* Historical Plastics */}
                        {historicalPlastics.length > 0 && (
                          <div className="pt-2 border-t border-slate-200/50 dark:border-slate-700/50 space-y-1">
                            <span className="text-2xs text-slate-400 flex items-center gap-1">
                              <History className="w-3 h-3" />
                              Replaced / Closed Plastics ({historicalPlastics.length})
                            </span>
                            <div className="flex flex-wrap gap-1.5 pt-0.5">
                              {historicalPlastics.map((hp) => (
                                <div
                                  key={hp.id}
                                  className="flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-200/60 dark:bg-slate-700/60 text-2xs text-slate-600 dark:text-slate-300"
                                >
                                  <span className="font-mono">•••• {hp.last4}</span>
                                  <span className="text-slate-400 text-3xs">
                                    ({formatDate(hp.issuedOn)} – {formatDate(hp.closedOn)})
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteCardPlastic(ch, hp)}
                                    title="Delete Plastic Entry"
                                    className="text-slate-400 hover:text-rose-500 transition-colors"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )
          )}
        </DialogBody>
      </DialogContent>
    </Dialog>
  );
}

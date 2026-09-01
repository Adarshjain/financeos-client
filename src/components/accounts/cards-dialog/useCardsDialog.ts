'use client';

import { useCallback, useState } from 'react';
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
import {
  Account,
  Card,
  Cardholder,
  CardholderRelationship,
  CreateCardholderRequest,
  CreateCardRequest,
  ReplaceCardRequest,
  UpdateCardholderRequest,
} from '@/lib/account.types';

export type ViewState =
  | 'list'
  | 'addAddon'
  | 'editCardholder'
  | 'closeCardholder'
  | 'issueCard'
  | 'replaceCard'
  | 'closeCard'
  | 'reassign';

export function useCardsDialog(account: Account) {
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

  const handleOpenChange = (nextOpen: boolean) => {
    setOpen(nextOpen);
    if (nextOpen) {
      loadData();
      backToList();
    }
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

  return {
    open,
    handleOpenChange,
    cardholders,
    isLoading,
    error,
    view,
    targetCardholder,
    targetCard,
    personName,
    setPersonName,
    relationship,
    setRelationship,
    spendLimit,
    setSpendLimit,
    cardLast4,
    setCardLast4,
    openedOn,
    setOpenedOn,
    issuedOn,
    setIssuedOn,
    closeDate,
    setCloseDate,
    replaceNewLast4,
    setReplaceNewLast4,
    replaceIssuedOn,
    setReplaceIssuedOn,
    formError,
    isSubmitting,
    reattributeFrom,
    setReattributeFrom,
    reattributeTo,
    setReattributeTo,
    reattributeSource,
    setReattributeSource,
    isReattributing,
    reattributeError,
    backToList,
    startAddAddon,
    startEditCardholder,
    startCloseCardholder,
    startIssueCard,
    startReplaceCard,
    startCloseCard,
    startReassign,
    handleSaveAddon,
    handleSaveEditCardholder,
    handleConfirmCloseCardholder,
    handleReopenCardholder,
    handleDeleteCardholder,
    handleSaveIssueCard,
    handleSaveReplaceCard,
    handleConfirmCloseCard,
    handleDeleteCardPlastic,
    handleConfirmReattribute,
  };
}

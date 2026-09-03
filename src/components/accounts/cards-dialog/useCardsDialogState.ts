'use client';

import { useState } from 'react';

import { Card, Cardholder, CardholderRelationship } from '@/lib/account.types';

import { ViewState } from './types';

/**
 * Pure UI/form state for the cards dialog: which sub-view is active, the
 * cardholder/card a sub-view targets, and every controlled form field. No
 * server data or mutations live here — see `useCardsDialogMutations` — so the
 * dialog's read/write wiring can change without touching this state machine.
 */
export function useCardsDialogState() {
  const [open, setOpen] = useState(false);

  const [view, setView] = useState<ViewState>('list');
  const [targetCardholder, setTargetCardholder] = useState<Cardholder | null>(null);
  const [targetCard, setTargetCard] = useState<Card | null>(null);

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

  const [reattributeFrom, setReattributeFrom] = useState('');
  const [reattributeTo, setReattributeTo] = useState('');
  const [reattributeSource, setReattributeSource] = useState<string>('UNATTRIBUTED');
  const [reattributeError, setReattributeError] = useState<string | null>(null);

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

  const startAddPrimary = () => {
    setView('addPrimary');
    setCardLast4('');
    setIssuedOn(new Date().toISOString().split('T')[0]);
    setFormError(null);
  };

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

  return {
    open,
    setOpen,
    view,
    setView,
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
    setFormError,
    reattributeFrom,
    setReattributeFrom,
    reattributeTo,
    setReattributeTo,
    reattributeSource,
    setReattributeSource,
    reattributeError,
    setReattributeError,
    backToList,
    startAddPrimary,
    startAddAddon,
    startEditCardholder,
    startCloseCardholder,
    startIssueCard,
    startReplaceCard,
    startCloseCard,
    startReassign,
  };
}

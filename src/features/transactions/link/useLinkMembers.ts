'use client';

import React from 'react';

import type { Transaction } from '@/lib/transaction.types';

import { anchorAfterRemove, anchorAfterRole, effectiveAnchorId, type LinkRole } from './linkModel';

/** The transactions being linked, which one is the main one, the note and the refund-category choice. */
export function useLinkMembers(initial: readonly Transaction[]) {
  const [members, setMembers] = React.useState<Transaction[]>(() => [...initial]);
  const [chosenAnchor, setChosenAnchor] = React.useState('');
  const [note, setNote] = React.useState('');
  const [alignRefundCategories, setAlignRefundCategories] = React.useState(true);

  const anchorId = effectiveAnchorId(members, chosenAnchor);

  const add = React.useCallback((t: Transaction) => {
    setMembers((current) => (current.some((m) => m.id === t.id) ? current : [...current, t]));
  }, []);

  const remove = React.useCallback(
    (id: string) => {
      setChosenAnchor(anchorAfterRemove(members, anchorId, id));
      setMembers((current) => current.filter((m) => m.id !== id));
    },
    [members, anchorId],
  );

  const setRole = React.useCallback(
    (id: string, role: LinkRole) => setChosenAnchor(anchorAfterRole(members, anchorId, id, role)),
    [members, anchorId],
  );

  return { members, anchorId, add, remove, setRole, note, setNote, alignRefundCategories, setAlignRefundCategories };
}

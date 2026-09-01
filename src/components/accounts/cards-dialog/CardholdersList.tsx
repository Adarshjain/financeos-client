'use client';

import { Loader2 } from 'lucide-react';

import { Card, Cardholder } from '@/lib/account.types';

import { CardholderItem } from './CardholderItem';

interface CardholdersListProps {
  isLoading: boolean;
  cardholders: Cardholder[];
  onEdit: (ch: Cardholder) => void;
  onReassign: (ch: Cardholder, openPlastic?: Card) => void;
  onReopen: (ch: Cardholder) => void;
  onClose: (ch: Cardholder) => void;
  onDelete: (ch: Cardholder) => void;
  onIssueCard: (ch: Cardholder) => void;
  onReplaceCard: (ch: Cardholder, card: Card) => void;
  onCloseCard: (ch: Cardholder, card: Card) => void;
  onDeleteCardPlastic: (ch: Cardholder, card: Card) => void;
}

export function CardholdersList({
  isLoading,
  cardholders,
  onEdit,
  onReassign,
  onReopen,
  onClose,
  onDelete,
  onIssueCard,
  onReplaceCard,
  onCloseCard,
  onDeleteCardPlastic,
}: CardholdersListProps) {
  if (isLoading) {
    return (
      <div className="py-12 flex justify-center items-center text-slate-400">
        <Loader2 className="w-6 h-6 animate-spin" />
      </div>
    );
  }

  if (cardholders.length === 0) {
    return (
      <div className="text-center py-10 text-xs text-slate-400 border border-dashed rounded-xl">
        No cardholders found for this account.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {cardholders.map((ch) => (
        <CardholderItem
          key={ch.id}
          cardholder={ch}
          onEdit={onEdit}
          onReassign={onReassign}
          onReopen={onReopen}
          onClose={onClose}
          onDelete={onDelete}
          onIssueCard={onIssueCard}
          onReplaceCard={onReplaceCard}
          onCloseCard={onCloseCard}
          onDeleteCardPlastic={onDeleteCardPlastic}
        />
      ))}
    </div>
  );
}

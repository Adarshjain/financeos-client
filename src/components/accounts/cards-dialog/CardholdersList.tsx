'use client';

import { Loader2 } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Card, Cardholder } from '@/lib/account.types';

import { CardholderItem } from './CardholderItem';

interface CardholdersListProps {
  isLoading: boolean;
  cardholders: Cardholder[];
  isBank?: boolean;
  onAddPrimary?: () => void;
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
  isBank,
  onAddPrimary,
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
    if (isBank) {
      return (
        <div className="text-center py-10 space-y-3 border border-dashed border-slate-200 dark:border-slate-800 rounded-xl">
          <p className="text-xs text-slate-400">No debit cards yet.</p>
          {onAddPrimary && (
            <Button size="sm" onClick={onAddPrimary}>
              Add your debit card
            </Button>
          )}
        </div>
      );
    }
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
          isBank={isBank}
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

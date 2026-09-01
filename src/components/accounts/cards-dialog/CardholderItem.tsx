'use client';

import {
  ArrowLeftRight,
  Edit2,
  History,
  Plus,
  RotateCcw,
  Trash2,
  XCircle,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, Cardholder, isCardholderClosed } from '@/lib/account.types';
import { cn, formatDate, formatMoney } from '@/lib/utils';

import { RELATIONSHIP_LABELS } from './constants';

interface CardholderItemProps {
  cardholder: Cardholder;
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

export function CardholderItem({
  cardholder: ch,
  onEdit,
  onReassign,
  onReopen,
  onClose,
  onDelete,
  onIssueCard,
  onReplaceCard,
  onCloseCard,
  onDeleteCardPlastic,
}: CardholderItemProps) {
  const isClosed = isCardholderClosed(ch);
  const openPlastic = (ch.cards || []).find((c) => !c.closedOn);
  const historicalPlastics = (ch.cards || []).filter((c) => c.closedOn);

  return (
    <div
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
            onClick={() => onEdit(ch)}
            title="Edit Cardholder Details"
          >
            <Edit2 className="w-3.5 h-3.5 text-slate-500" />
          </Button>
          <Button
            variant="ghost"
            size="icon-xs"
            onClick={() => onReassign(ch, openPlastic)}
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
                  onClick={() => onReopen(ch)}
                  title="Reopen Cardholder Line"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-emerald-600" />
                </Button>
              ) : (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => onClose(ch)}
                  title="Close Cardholder Line"
                >
                  <XCircle className="w-3.5 h-3.5 text-rose-500" />
                </Button>
              )}
              {(ch.transactionCount === 0 || ch.transactionCount === undefined) && (
                <Button
                  variant="ghost"
                  size="icon-xs"
                  onClick={() => onDelete(ch)}
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
              onClick={() => onIssueCard(ch)}
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
                  onClick={() => onReplaceCard(ch, openPlastic)}
                  className="h-6 text-2xs"
                >
                  Replace
                </Button>
                <Button
                  size="xs"
                  variant="ghost"
                  onClick={() => onCloseCard(ch, openPlastic)}
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
                    onClick={() => onDeleteCardPlastic(ch, hp)}
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
}

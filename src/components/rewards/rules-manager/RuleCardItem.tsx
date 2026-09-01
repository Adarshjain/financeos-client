'use client';

import {
  ArrowDown,
  ArrowUp,
  CalendarOff,
  Copy,
  MoreVertical,
  Pencil,
  Trash2,
} from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { RewardRule } from '@/lib/rewards.types';
import { cn, formatDate } from '@/lib/utils';

import { accrualSummary, capSummary, matchSummary } from './helpers';

interface RuleCardItemProps {
  rule: RewardRule;
  index: number;
  totalRules: number;
  today: string;
  onMove: (index: number, direction: -1 | 1) => void;
  onEdit: (rule: RewardRule) => void;
  onClone: (rule: RewardRule) => void;
  onEndDateAndClone: (rule: RewardRule) => void;
  onDelete: (rule: RewardRule) => void;
}

export function RuleCardItem({
  rule,
  index,
  totalRules,
  today,
  onMove,
  onEdit,
  onClone,
  onEndDateAndClone,
  onDelete,
}: RuleCardItemProps) {
  const ended = !!rule.activeTo && rule.activeTo <= today;

  return (
    <div
      className={cn(
        'bg-white dark:bg-slate-900/60 rounded-xl border border-slate-100 dark:border-slate-800/80 shadow-sm p-3 flex items-center gap-3',
        ended && 'opacity-55'
      )}
    >
      {/* Reorder */}
      <div className="flex flex-col gap-0.5">
        <button
          type="button"
          aria-label="Move up"
          onClick={() => onMove(index, -1)}
          disabled={index === 0}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 disabled:opacity-30"
        >
          <ArrowUp className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          aria-label="Move down"
          onClick={() => onMove(index, 1)}
          disabled={index === totalRules - 1}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 disabled:opacity-30"
        >
          <ArrowDown className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-slate-700 dark:text-slate-200 truncate">
            {rule.name}
          </span>
          <Badge
            size="xs"
            variant={rule.stacking === 'EXCLUSIVE' ? 'slate' : 'violet'}
          >
            {rule.stacking === 'EXCLUSIVE' ? 'excl' : 'add'}
          </Badge>
          {ended && (
            <Badge size="xs" variant="amber">
              ended
            </Badge>
          )}
        </div>
        <div className="text-xs text-emerald-700 dark:text-emerald-400 font-semibold mt-0.5">
          {accrualSummary(rule)}
          {capSummary(rule) && (
            <span className="text-slate-400 dark:text-slate-500 font-medium">
              {' '}
              · {capSummary(rule)}
            </span>
          )}
          {rule.perTxnCap != null && (
            <span className="text-slate-400 dark:text-slate-500 font-medium">
              {' '}
              · max {rule.perTxnCap}/txn
            </span>
          )}
        </div>
        <div className="text-2xs text-slate-400 dark:text-slate-500 truncate mt-0.5">
          {matchSummary(rule)}
          <span className="mx-1">·</span>
          {rule.activeFrom ? formatDate(rule.activeFrom) : 'always'} →{' '}
          {rule.activeTo ? formatDate(rule.activeTo) : 'open'}
        </div>
      </div>

      {/* Actions 3-dot dropdown menu */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label="Rule actions"
          >
            <MoreVertical className="w-4 h-4 text-slate-500" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onClick={() => onEdit(rule)}>
            <Pencil className="w-3.5 h-3.5 mr-2" /> Edit Rule
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => onClone(rule)}>
            <Copy className="w-3.5 h-3.5 mr-2" /> Clone Rule
          </DropdownMenuItem>
          {!ended && (
            <DropdownMenuItem onClick={() => void onEndDateAndClone(rule)}>
              <CalendarOff className="w-3.5 h-3.5 mr-2" /> End & Clone
            </DropdownMenuItem>
          )}
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={() => void onDelete(rule)}
            className="text-rose-600 dark:text-rose-400 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950/30"
          >
            <Trash2 className="w-3.5 h-3.5 mr-2 text-rose-600 dark:text-rose-400" />{' '}
            Delete Rule
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}

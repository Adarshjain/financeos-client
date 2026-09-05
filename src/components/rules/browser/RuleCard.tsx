'use client';

import { Check, Edit, ListChecks, MoreVertical, Trash2 } from 'lucide-react';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { CategoryRule, MatchType } from '@/lib/rules.types';
import { formatRelativeTime } from '@/lib/utils';

export const MATCH_TYPE_META: Record<
  MatchType,
  { label: string; chip: string; placeholder: string; help: string }
> = {
  MERCHANT_KEY: {
    label: 'Merchant key (smart contains)',
    chip: 'Key',
    placeholder: 'e.g. STARBUCKS',
    help: 'Matches descriptions containing this text after cleanup — numbers, punctuation, and noise words (UPI, POS…) are ignored. At least 3 letters.',
  },
  CONTAINS: {
    label: 'Contains text',
    chip: 'Contains',
    placeholder: 'e.g. UPI-AUTOPAY/042',
    help: 'Matches descriptions containing this exact text anywhere, case-insensitively. Numbers and punctuation count.',
  },
  STARTS_WITH: {
    label: 'Starts with',
    chip: 'Starts with',
    placeholder: 'e.g. ACH/',
    help: 'Matches descriptions beginning with this exact text, case-insensitively.',
  },
  EXACT: {
    label: 'Exact match',
    chip: 'Exact',
    placeholder: 'e.g. NEFT SALARY CREDIT',
    help: 'Matches only descriptions that are exactly this text, case-insensitively.',
  },
  REGEX: {
    label: 'Regex',
    chip: 'Regex',
    placeholder: 'e.g. NEFT.*(HDFC|ICICI)',
    help: 'Matches descriptions where this regular expression finds a match, case-insensitively. Max 200 characters.',
  },
};

interface RuleCardProps {
  rule: CategoryRule;
  onMatches: (rule: CategoryRule) => void;
  onVerify: (id: string) => void;
  onEdit: (rule: CategoryRule) => void;
  onDelete: (rule: CategoryRule) => void;
}

export function RuleCard({
  rule,
  onMatches,
  onVerify,
  onEdit,
  onDelete,
}: RuleCardProps) {
  return (
    <div className="relative rounded-2xl border border-slate-200/50 dark:border-slate-800/60 bg-white dark:bg-slate-900/50 p-3 shadow-sm hover:shadow-md hover:border-slate-350 dark:hover:border-slate-700 transition-all duration-300 flex flex-col justify-between">
      {/* Header Info */}
      <div className="space-y-2">
        <div className="flex justify-between items-start gap-2">
          <div className="min-w-0">
            <h3 className="text-slate-900 dark:text-white truncate">
              {rule.displayName || rule.merchantKey}
            </h3>
            {(rule.displayName || rule.matchType !== 'MERCHANT_KEY') && (
              <span className="text-2xs tabular-nums px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-500 mt-1 block w-fit font-medium">
                {
                  (
                    MATCH_TYPE_META[rule.matchType] ||
                    MATCH_TYPE_META.MERCHANT_KEY
                  ).chip
                }
                : {rule.merchantKey}
              </span>
            )}
          </div>
          <div className="flex gap-1.5 shrink-0">
            <Badge
              variant={rule.verified ? 'success' : 'warning'}
              className="text-2xs font-bold px-2 py-0.5 rounded-md"
            >
              {rule.verified ? 'Verified' : 'Unverified'}
            </Badge>
            <Badge
              variant={rule.source === 'LLM' ? 'info' : 'secondary'}
              className="text-2xs font-bold px-2 py-0.5 rounded-md"
            >
              {rule.source}
            </Badge>
            {rule.mcc && (
              <span className="text-2xs tabular-nums px-2 py-0.5 rounded-md font-bold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300">
                MCC: {rule.mcc}
              </span>
            )}
          </div>
        </div>

        {/* Categories */}
        <div className="flex flex-wrap gap-1.5 pt-1">
          {rule.categories.length === 0 ? (
            <span className="text-xs text-slate-400 italic">
              No categories
            </span>
          ) : (
            rule.categories.map((c) => (
              <Badge
                key={c.id}
                variant="outline"
                className="rounded-full px-2.5 py-0 text-2xs border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400"
              >
                {c.name}
              </Badge>
            ))
          )}
        </div>
      </div>

      {/* Footer and Actions */}
      <div className="flex items-center justify-between pt-3 text-xs">
        <div className="text-slate-400 dark:text-slate-500 space-y-0.5">
          <div>Used {rule.appliedCount}×</div>
          <div className="text-2xs">
            Last active: {formatRelativeTime(rule.lastAppliedAt)}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {!rule.verified && (
            <Button
              variant="outline"
              size="xs"
              onClick={() => onVerify(rule.id)}
            >
              <Check />
              Approve
            </Button>
          )}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="icon-sm"
                aria-label="Rule actions"
              >
                <MoreVertical className="h-4 w-4 text-slate-500" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onMatches(rule)}>
                <ListChecks className="w-3.5 h-3.5 mr-2" /> Find Matches
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(rule)}>
                <Edit className="w-3.5 h-3.5 mr-2" /> Edit Rule
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(rule)}
                className="text-rose-600 dark:text-rose-400 focus:text-rose-600 focus:bg-rose-50 dark:focus:bg-rose-950/30"
              >
                <Trash2 className="w-3.5 h-3.5 mr-2 text-rose-600 dark:text-rose-400" />{' '}
                Delete Rule
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

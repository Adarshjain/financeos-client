'use client';

import { Loader2 } from 'lucide-react';

import { Card } from '@/components/ui/card';
import { RewardRecommendationResponse } from '@/lib/rewards.types';
import { formatMoney } from '@/lib/utils';

import { RecommendationCardItem } from './RecommendationCardItem';

interface SimulatorResultsProps {
  loading: boolean;
  result: RewardRecommendationResponse | null;
  expandedCards: Record<string, boolean>;
  onToggleExpand: (accountId: string) => void;
}

export function SimulatorResults({
  loading,
  result,
  expandedCards,
  onToggleExpand,
}: SimulatorResultsProps) {
  return (
    <div className="lg:col-span-2 space-y-3">
      {!result && !loading && (
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm p-6 text-center">
          <p className="text-xs text-slate-500">
            Enter spend details on the left and click{' '}
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              Rank cards
            </span>{' '}
            to simulate rewards across your cards.
          </p>
        </Card>
      )}

      {loading && (
        <Card className="rounded-2xl border-slate-200 dark:border-slate-800 shadow-sm p-6 text-center flex items-center justify-center gap-2">
          <Loader2 className="h-4 w-4 animate-spin text-slate-400" />
          <span className="text-xs text-slate-500">
            Simulating card rewards...
          </span>
        </Card>
      )}

      {result && !loading && (
        <div className="space-y-2.5">
          {/* Header Summary Bar */}
          <div className="flex items-center justify-between px-1">
            <span className="text-2xs uppercase tracking-wide font-bold text-slate-400 dark:text-slate-500">
              {result.recommendations.length} card
              {result.recommendations.length === 1 ? '' : 's'} evaluated
            </span>
            <span className="text-2xs text-slate-400 font-mono">
              Spend: {formatMoney(result.input.amount)}
            </span>
          </div>

          {/* Recommendation Cards List */}
          <div className="space-y-2.5">
            {result.recommendations.map((card) => (
              <RecommendationCardItem
                key={card.accountId}
                card={card}
                isExpanded={!!expandedCards[card.accountId]}
                onToggleExpand={() => onToggleExpand(card.accountId)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

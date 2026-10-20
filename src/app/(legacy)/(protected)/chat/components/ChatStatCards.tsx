'use client';

import React from 'react';

export interface ChatStat {
  label: string;
  value: string;
  delta?: string;
  sentiment?: 'good' | 'bad' | 'neutral';
}

interface ChatStatCardsProps {
  stats: ChatStat[];
}

export function ChatStatCards({ stats }: ChatStatCardsProps) {
  if (!stats || stats.length === 0) return null;

  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-2 lg:grid-cols-4">
      {stats.map((stat, idx) => {
        const sentiment = stat.sentiment || 'neutral';
        const sentimentColor =
          sentiment === 'good'
            ? 'text-emerald-600 dark:text-emerald-400'
            : sentiment === 'bad'
              ? 'text-rose-600 dark:text-rose-400'
              : 'text-[var(--ink-3)]';

        return (
          <div
            key={idx}
            className="flex flex-col gap-0.5 rounded-[10px] bg-[var(--surface)] p-3 shadow-[var(--shadow-hairline)]"
          >
            <span className="text-2xs text-[var(--ink-3)] truncate">
              {stat.label}
            </span>
            <span className="text-sm font-semibold tabular-nums text-[var(--ink)] truncate">
              {stat.value}
            </span>
            {stat.delta ? (
              <span className={`text-2xs tabular-nums truncate ${sentimentColor}`}>
                {stat.delta}
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

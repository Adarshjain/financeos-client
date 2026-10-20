'use client';

import { ChevronDown } from 'lucide-react';
import { useState } from 'react';

import { ChatTrace, formatActionLabel } from './chat.types';

export function LiveTraceFeed({ traces }: { traces: ChatTrace[] }) {
  const [expandedIndices, setExpandedIndices] = useState<Record<number, boolean>>({});

  if (!traces || traces.length === 0) return null;

  const toggleIndex = (idx: number) => {
    setExpandedIndices((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  return (
    <div className="space-y-1.5 pt-1">
      {traces.map((trace, i) => {
        const isItemExpanded = Boolean(expandedIndices[i]);
        const isFailed = trace.success === false;
        const hasExpandableContent = Boolean(trace.detail || trace.resultPreview);
        return (
          <div
            key={i}
            className="rounded-[8px] transition-colors"
            style={{
              animationName: 'bui-fade-up',
              animationDuration: '400ms',
              animationTimingFunction: 'var(--ease-out-strong)',
              animationFillMode: 'both',
            }}
          >
            <button
              type="button"
              onClick={() => hasExpandableContent && toggleIndex(i)}
              disabled={!hasExpandableContent}
              className={`-mx-1 flex w-full items-center justify-between gap-1.5 rounded-[6px] px-1 py-0.5 text-left transition-colors duration-100 ${
                hasExpandableContent
                  ? 'cursor-pointer hover:bg-[var(--hover-2)]'
                  : 'cursor-default'
              }`}
            >
              <div className="flex items-center gap-1.5 text-2xs leading-[1.3] min-w-0">
                <span
                  className={`font-medium shrink-0 ${
                    isFailed
                      ? 'text-rose-600 dark:text-rose-400'
                      : 'text-[var(--ink)]'
                  }`}
                >
                  {formatActionLabel(trace.action)}
                </span>
                <span
                  className={`truncate ${
                    isFailed
                      ? 'text-rose-600/80 dark:text-rose-400/80'
                      : 'text-[var(--ink-2)]'
                  }`}
                >
                  {trace.summary}
                </span>
              </div>
              <div className="flex items-center gap-1 font-mono text-2xs tabular-nums text-[var(--ink-3)] shrink-0">
                {trace.durationMs ? (
                  <span>{(trace.durationMs / 1000).toFixed(1)}s</span>
                ) : null}
                {hasExpandableContent && (
                  <ChevronDown
                    className={`size-3 transition-transform duration-300 ${
                      isItemExpanded ? 'rotate-180' : ''
                    }`}
                  />
                )}
              </div>
            </button>

            {isFailed && trace.error && (
              <p className="px-0.5 pt-0.5 text-2xs text-rose-600 dark:text-rose-400">
                {trace.error}
              </p>
            )}

            {hasExpandableContent && (
              <div
                className={`grid transition-[grid-template-rows,opacity] duration-300 [transition-timing-function:var(--ease-out-strong)] ${
                  isItemExpanded
                    ? 'grid-rows-[1fr] opacity-100'
                    : 'grid-rows-[0fr] opacity-0 pointer-events-none'
                }`}
              >
                <div className="overflow-hidden min-h-0">
                  <div className="mt-1 space-y-1.5">
                    {trace.detail && (
                      <div>
                        <div className="text-2xs font-medium text-[var(--ink-3)] mb-0.5">
                          {trace.action === 'run_sql' ? 'Query' : 'Arguments'}
                        </div>
                        <div className="overflow-x-auto whitespace-pre rounded-[8px] bg-[var(--inset)] p-2 font-mono text-2xs text-[var(--ink)] shadow-[var(--shadow-hairline)]">
                          {trace.detail}
                        </div>
                      </div>
                    )}
                    {trace.resultPreview && (
                      <div>
                        <div className="text-2xs font-medium text-[var(--ink-3)] mb-0.5">
                          Result
                        </div>
                        <div className="overflow-x-auto whitespace-pre rounded-[8px] bg-[var(--inset)] p-2 font-mono text-2xs text-[var(--ink)] shadow-[var(--shadow-hairline)]">
                          {trace.resultPreview}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

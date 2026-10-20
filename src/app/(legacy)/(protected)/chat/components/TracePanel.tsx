'use client';

import { ChevronDown } from 'lucide-react';

import { ChatTrace, formatActionLabel, formatTotalDuration } from './chat.types';

interface TracePanelProps {
  traces: ChatTrace[];
  isExpanded: boolean;
  onToggle: () => void;
}

export function TracePanel({ traces, isExpanded, onToggle }: TracePanelProps) {
  const stepText = traces.length === 1 ? 'step' : 'steps';

  return (
    <div className="pt-1">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-fit items-center gap-2 rounded-[8px] px-1.5 py-1 transition-colors duration-100 hover:bg-[var(--hover-2)] active:scale-[0.96] cursor-pointer"
        aria-expanded={isExpanded}
      >
        <span className="text-2xs font-medium text-[var(--ink-2)]">
          Ran {traces.length} {stepText} · {formatTotalDuration(traces)}
        </span>
        <ChevronDown
          className={`size-3.5 text-[var(--ink-3)] transition-transform duration-300 ${
            isExpanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      <div
        className={`grid transition-[grid-template-rows,opacity] duration-400 [transition-timing-function:var(--ease-out-strong)] ${
          isExpanded
            ? 'grid-rows-[1fr] opacity-100'
            : 'grid-rows-[0fr] opacity-0 pointer-events-none'
        }`}
      >
        <div className="overflow-hidden min-h-0">
          <div className="relative mt-2 ml-[5px] pl-4">
            <div
              className="absolute left-[3px] top-0 w-px bg-[var(--line)] transition-[height] duration-500 [transition-timing-function:var(--ease-out-strong)]"
              style={{ height: isExpanded ? '100%' : '0%' }}
            />
            <div className="space-y-3 pb-1">
              {traces.map((trace, tIdx) => {
                const isFailed = trace.success === false;
                const hasExpandableContent = Boolean(trace.detail || trace.resultPreview);
                return (
                  <div
                    key={tIdx}
                    className="relative"
                    style={
                      isExpanded
                        ? {
                            animationName: 'bui-fade-up',
                            animationDuration: '300ms',
                            animationTimingFunction: 'var(--ease-out-strong)',
                            animationFillMode: 'both',
                            animationDelay: `${tIdx * 50}ms`,
                          }
                        : undefined
                    }
                  >
                    <div
                      className={`absolute -left-[15px] top-1.5 size-[5px] rounded-full ${
                        isFailed ? 'bg-rose-500' : 'bg-[var(--ink-3)]'
                      }`}
                    />
                    <div className="flex items-center justify-between text-2xs">
                      <div className="flex items-center gap-1.5 min-w-0">
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
                      <span className="font-mono tabular-nums text-[var(--ink-3)] shrink-0 ml-2">
                        {trace.durationMs ? `${trace.durationMs}ms` : ''}
                        {trace.rowCount !== null && trace.rowCount !== undefined
                          ? ` · ${trace.rowCount} rows`
                          : ''}
                      </span>
                    </div>
                    {isFailed && trace.error && (
                      <p className="mt-0.5 text-2xs text-rose-600 dark:text-rose-400">
                        {trace.error}
                      </p>
                    )}
                    {hasExpandableContent && (
                      <div className="mt-1.5 space-y-1.5">
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
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

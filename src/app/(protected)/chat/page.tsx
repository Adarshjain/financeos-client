'use client';

import {
  ArrowUp,
  BarChart3,
  ChevronDown,
  CreditCard,
  Plus,
  TrendingUp,
  Wallet,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { Button } from '@/components/ui/button';

import {
  ChatChartBlock,
  ChatChartCard,
} from './components/ChatChartCard';
import {
  ChatDataTable,
  ChatTableBlock,
} from './components/ChatDataTable';
import {
  ChatReportDraft,
  ChatReportDraftCard,
} from './components/ChatReportDraftCard';
import {
  ChatStat,
  ChatStatCards,
} from './components/ChatStatCards';
import { FollowUpChips } from './components/FollowUpChips';
import { buildTranscript } from './lib/transcript';

export interface ChatBlocks {
  stats?: ChatStat[];
  charts?: ChatChartBlock[];
  tables?: ChatTableBlock[];
  followUps?: string[];
  reportDraft?: ChatReportDraft;
}

interface ChatTrace {
  step: number;
  action: string;
  summary: string;
  detail?: string;
  rowCount?: number | null;
  durationMs?: number | null;
  success?: boolean;
  error?: string;
  resultPreview?: string;
}

interface Message {
  role: 'user' | 'assistant';
  content?: string;
  clarify?: string;
  clarifyOptions?: string[];
  blocks?: ChatBlocks;
  traces?: ChatTrace[];
  isStreaming?: boolean;
  status?: string;
  error?: string;
  startTime?: number;
}

const SUGGESTIONS = [
  {
    title: 'Spend Analysis',
    prompt: 'What was my total spend last month by category?',
    icon: BarChart3,
  },
  {
    title: 'Card Recommendation',
    prompt: 'Which credit card gives the best rewards for ₹5,000 dining?',
    icon: CreditCard,
  },
  {
    title: 'Net Worth Summary',
    prompt: 'Show my current net worth breakdown across all accounts.',
    icon: Wallet,
  },
  {
    title: 'Portfolio Holdings',
    prompt: 'Summarize my top investment holdings and total valuation.',
    icon: TrendingUp,
  },
];

const PIXEL_DELAYS = [180, 360, 540, 0, 180, 360, 180, 360, 540];

function PixelGridLoader({ className }: { className?: string }) {
  return (
    <div
      className={`grid grid-cols-[repeat(3,4px)] gap-[1.5px] ${className || ''}`}
      aria-hidden="true"
    >
      {PIXEL_DELAYS.map((delay, i) => (
        <div
          key={i}
          className="size-[4px] rounded-[1px] bg-[var(--ink)] opacity-[0.15]"
          style={{
            animationName: 'bui-pixel-on',
            animationDuration: '1400ms',
            animationTimingFunction: 'ease-in-out',
            animationIterationCount: 'infinite',
            animationDelay: `${delay}ms`,
          }}
        />
      ))}
    </div>
  );
}

function formatActionLabel(action: string): string {
  if (action === 'run_sql') return 'Query';
  return action
    .split('_')
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function formatTotalDuration(traces?: ChatTrace[]): string {
  if (!traces || traces.length === 0) return '0.0s';
  const totalMs = traces.reduce((acc, t) => acc + (t.durationMs || 0), 0);
  if (totalMs > 0) {
    return `${(totalMs / 1000).toFixed(1)}s`;
  }
  return '0.0s';
}

function ThinkingIndicator({
  status,
  startTime,
  isStreaming,
}: {
  status?: string;
  startTime?: number;
  isStreaming?: boolean;
}) {
  const [elapsed, setElapsed] = useState('0.0s');

  useEffect(() => {
    if (!isStreaming || !startTime) return;

    const interval = setInterval(() => {
      const ms = Date.now() - startTime;
      setElapsed(`${(ms / 1000).toFixed(1)}s`);
    }, 100);

    return () => clearInterval(interval);
  }, [isStreaming, startTime]);

  return (
    <div className="flex items-center gap-2 text-2xs">
      <PixelGridLoader />
      <span
        className="bg-clip-text text-transparent text-xs font-medium"
        style={{
          backgroundImage:
            'linear-gradient(90deg, var(--ink-3) 35%, var(--ink) 50%, var(--ink-3) 65%)',
          backgroundSize: '200% 100%',
          animationName: 'bui-shimmer-text',
          animationDuration: '1.4s',
          animationTimingFunction: 'linear',
          animationIterationCount: 'infinite',
        }}
      >
        {status || 'Thinking…'}
      </span>
      <span className="font-mono text-2xs text-[var(--ink-3)] tabular-nums">
        {elapsed}
      </span>
    </div>
  );
}

function LiveTraceFeed({ traces }: { traces: ChatTrace[] }) {
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

function StreamingCaret() {
  return (
    <span
      className="inline-block h-3 w-0.5 translate-y-0.5 rounded-full bg-[var(--ink)]"
      style={{
        animation:
          'bui-fade-in 150ms ease-out both, bui-caret-blink 1s step-end infinite',
      }}
      aria-hidden="true"
    />
  );
}

function TracePanel({
  traces,
  isExpanded,
  onToggle,
}: {
  traces: ChatTrace[];
  isExpanded: boolean;
  onToggle: () => void;
}) {
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

function UserBubble({ content }: { content?: string }) {
  return (
    <div
      className="flex justify-end pl-14"
      style={{
        animationName: 'bui-fade-up',
        animationDuration: '400ms',
        animationTimingFunction: 'var(--ease-out-strong)',
        animationFillMode: 'both',
      }}
    >
      <div className="max-w-[80%] rounded-xl bg-[var(--field)] px-3 py-1.5 text-xs leading-[1.4] text-[var(--ink)] shadow-[var(--shadow-hairline)]">
        <p className="whitespace-pre-wrap">{content}</p>
      </div>
    </div>
  );
}

function AssistantMessage({
  msg,
  isExpanded,
  onToggleTrace,
  isLastAssistant,
  isAnyStreaming,
  onSelectFollowUp,
  onDraftStateChange,
}: {
  msg: Message;
  isExpanded: boolean;
  onToggleTrace: () => void;
  isLastAssistant?: boolean;
  isAnyStreaming?: boolean;
  onSelectFollowUp?: (question: string) => void;
  onDraftStateChange?: (update: {
    status: 'saved' | 'updated' | 'deleted' | 'failed';
    savedReportId?: string;
    errorMessage?: string;
  }) => void;
}) {
  const hasTraces = Boolean(msg.traces && msg.traces.length > 0);
  const hasStats = Boolean(msg.blocks?.stats && msg.blocks.stats.length > 0);
  const hasCharts = Boolean(msg.blocks?.charts && msg.blocks.charts.length > 0);
  const hasTables = Boolean(msg.blocks?.tables && msg.blocks.tables.length > 0);
  const hasReportDraft = Boolean(msg.blocks?.reportDraft);
  const hasFollowUps = Boolean(
    isLastAssistant &&
      !isAnyStreaming &&
      onSelectFollowUp &&
      msg.blocks?.followUps &&
      msg.blocks.followUps.length > 0,
  );

  return (
    <div
      className="flex-1 pt-0.5 overflow-hidden"
      style={{
        animationName: 'bui-fade-up',
        animationDuration: '400ms',
        animationTimingFunction: 'var(--ease-out-strong)',
        animationFillMode: 'both',
      }}
    >
      {/* Streaming status / thinking (Top section while query is running) */}
      {msg.isStreaming && !msg.content && (
        <div className="space-y-2">
          <ThinkingIndicator
            status={msg.status}
            startTime={msg.startTime}
            isStreaming={msg.isStreaming}
          />
          {hasTraces && <LiveTraceFeed traces={msg.traces!} />}
          {!msg.clarify && (
            <div className="pt-0.5">
              <StreamingCaret />
            </div>
          )}
        </div>
      )}

      {/* Render order: stats row -> clarify -> markdown answer -> charts -> tables -> draft card -> follow-up chips -> error -> trace panel */}

      {/* 1. Stat cards */}
      {hasStats && (
        <div className="mb-2.5">
          <ChatStatCards stats={msg.blocks!.stats!} />
        </div>
      )}

      {/* 2. Clarification prompt */}
      {msg.clarify && (
        <div className="rounded-[10px] bg-[var(--accent-tint)] px-3 py-2 text-2xs text-[var(--ink)] mb-2.5">
          <p className="font-medium">{msg.clarify}</p>
          {isLastAssistant &&
            !isAnyStreaming &&
            onSelectFollowUp &&
            msg.clarifyOptions &&
            msg.clarifyOptions.length > 0 && (
              <div className="mt-1">
                <FollowUpChips
                  questions={msg.clarifyOptions}
                  onSelect={onSelectFollowUp}
                  variant="onTint"
                />
              </div>
            )}
        </div>
      )}

      {/* 3. Final Markdown Answer */}
      {msg.content && (
        <div className="prose prose-sm dark:prose-invert max-w-none text-xs leading-relaxed text-[var(--ink)] [&_table]:my-3 [&_table]:w-full [&_table]:border-collapse [&_table]:text-2xs [&_table]:tabular-nums [&_table]:block [&_table]:overflow-x-auto [&_table]:whitespace-nowrap [&_th]:border-b [&_th]:border-[var(--line)] [&_th]:pb-1.5 [&_th]:text-left [&_th]:font-semibold [&_th]:text-[var(--ink)] [&_td]:border-b [&_td]:border-[var(--line)] [&_td]:py-1.5 [&_td]:text-[var(--ink)] [&_td]:align-top">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {msg.content}
          </ReactMarkdown>
          {msg.isStreaming && (
            <span className="ml-1 inline-block">
              <StreamingCaret />
            </span>
          )}
        </div>
      )}

      {/* 4. Charts */}
      {hasCharts && (
        <div className="space-y-2.5 mt-2.5">
          {msg.blocks!.charts!.map((chart, cIdx) => (
            <ChatChartCard key={cIdx} chart={chart} />
          ))}
        </div>
      )}

      {/* 5. Tables */}
      {hasTables && (
        <div className="space-y-2.5 mt-2.5">
          {msg.blocks!.tables!.map((table, tIdx) => (
            <ChatDataTable key={tIdx} table={table} />
          ))}
        </div>
      )}

      {/* 5b. Report Draft Card */}
      {hasReportDraft && (
        <div className="mt-2.5">
          <ChatReportDraftCard
            draft={msg.blocks!.reportDraft!}
            onStateChange={(update) => onDraftStateChange?.(update)}
          />
        </div>
      )}

      {/* 6. Follow-up chips */}
      {hasFollowUps && (
        <div className="mt-2.5">
          <FollowUpChips
            questions={msg.blocks!.followUps!}
            onSelect={onSelectFollowUp!}
          />
        </div>
      )}

      {/* 7. Error notice */}
      {msg.error && (
        <div className="mt-2.5 rounded-[10px] bg-rose-50/60 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300 px-3 py-2 text-2xs shadow-[0_0_0_1px_theme(colors.rose.200)] dark:shadow-[0_0_0_1px_theme(colors.rose.900/50)]">
          <p className="font-medium">{msg.error}</p>
        </div>
      )}

      {/* 8. Post-completion trace disclosure (Lower section only when query is done) */}
      {!msg.isStreaming && hasTraces && (
        <TracePanel
          traces={msg.traces!}
          isExpanded={isExpanded}
          onToggle={onToggleTrace}
        />
      )}
    </div>
  );
}

function EmptyState({
  onSelectPrompt,
}: {
  onSelectPrompt: (prompt: string) => void;
}) {
  return (
    <div className="my-auto flex flex-col items-center justify-center text-center">
      <h2 className="text-base font-medium tracking-tight text-[var(--ink)]">
        How can I help with your finances today?
      </h2>
      <p className="mt-1.5 max-w-md text-2xs text-[var(--ink-3)]">
        Ask questions about transactions, net worth, portfolio holdings, or
        credit card reward optimizations.
      </p>

      <div className="mt-8 grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
        {SUGGESTIONS.map((item, i) => {
          const Icon = item.icon;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelectPrompt(item.prompt)}
              className="group flex flex-col items-start gap-1 rounded-[10px] bg-[var(--surface)] p-3.5 text-left shadow-[var(--shadow-hairline)] transition-[background-color,box-shadow,transform] duration-150 hover:bg-[var(--hover)] hover:shadow-[var(--shadow-btn)] active:scale-[0.98] cursor-pointer"
              style={{
                animationName: 'bui-fade-up',
                animationDuration: '450ms',
                animationTimingFunction: 'var(--ease-out-strong)',
                animationFillMode: 'both',
                animationDelay: `${i * 60}ms`,
              }}
            >
              <div className="flex items-center gap-2 text-xs font-medium text-[var(--ink)]">
                <Icon className="size-4 text-[var(--ink-3)] transition-colors duration-150 group-hover:text-[var(--ink)]" />
                <span>{item.title}</span>
              </div>
              <p className="text-2xs text-[var(--ink-3)] line-clamp-2">
                {item.prompt}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Composer({
  input,
  setInput,
  isStreaming,
  onSend,
  awaitingClarify,
}: {
  input: string;
  setInput: (val: string) => void;
  isStreaming: boolean;
  onSend: () => void;
  awaitingClarify?: boolean;
}) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus on page load, and re-focus whenever a clarifying question arrives.
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    if (awaitingClarify) {
      textareaRef.current?.focus();
    }
  }, [awaitingClarify]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <footer className="sticky bottom-0 mx-auto w-full max-w-3xl px-3 pt-2 pb-16 lg:pb-4">
      <div
        role="presentation"
        onClick={() => textareaRef.current?.focus()}
        className="flex cursor-text flex-col gap-2 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-2.5 shadow-[var(--shadow-card)] transition-[border-color,box-shadow] duration-150 focus-within:border-[var(--line-strong)]"
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            awaitingClarify
              ? 'Reply to the question above…'
              : 'Ask anything about your data…'
          }
          disabled={isStreaming}
          rows={1}
          className="w-full resize-none border-0 bg-transparent p-0 text-xs leading-[1.4] text-[var(--ink)] placeholder:text-[var(--ink-3)] shadow-none focus-visible:ring-0 focus-visible:outline-none max-h-36 overflow-y-auto"
          style={{ fieldSizing: 'content' } as React.CSSProperties}
        />
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={onSend}
            disabled={!input.trim() || isStreaming}
            className={`size-7 rounded-[8px] flex items-center justify-center transition-[background-color,color,transform] duration-200 enabled:active:scale-[0.96] disabled:cursor-not-allowed ${
              !input.trim() || isStreaming
                ? 'bg-[var(--line-strong)] text-[var(--ink-2)]'
                : 'bg-[var(--accent)] text-white'
            }`}
            aria-label="Send message"
          >
            {isStreaming ? (
              <PixelGridLoader className="[&>div]:bg-current" />
            ) : (
              <ArrowUp className="size-4" strokeWidth={2.4} />
            )}
          </button>
        </div>
      </div>
    </footer>
  );
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [expandedTraces, setExpandedTraces] = useState<Record<number, boolean>>(
    {},
  );

  const containerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottomIfNear = (force = false) => {
    const container = containerRef.current;
    if (!container) return;
    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <=
      120;
    if (force || isNearBottom) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  useEffect(() => {
    scrollToBottomIfNear();
  }, [messages, isStreaming]);

  const toggleTrace = (index: number) => {
    setExpandedTraces((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const handleDraftStateChange = (
    index: number,
    update: {
      status: 'saved' | 'updated' | 'deleted' | 'failed';
      savedReportId?: string;
      errorMessage?: string;
    },
  ) => {
    setMessages((prev) => {
      const updated = [...prev];
      const targetMsg = updated[index];
      if (targetMsg && targetMsg.blocks && targetMsg.blocks.reportDraft) {
        updated[index] = {
          ...targetMsg,
          blocks: {
            ...targetMsg.blocks,
            reportDraft: {
              ...targetMsg.blocks.reportDraft,
              ...update,
            },
          },
        };
      }
      return updated;
    });
  };

  const handleClearChat = () => {
    if (isStreaming) return;
    setMessages([]);
    setExpandedTraces({});
  };

  const handleSendPrompt = (promptText: string) => {
    if (isStreaming || !promptText.trim()) return;
    executeSend(promptText.trim());
  };

  const handleSend = () => {
    const prompt = input.trim();
    if (!prompt || isStreaming) return;
    setInput('');
    executeSend(prompt);
  };

  const executeSend = async (prompt: string) => {
    const startTime = Date.now();
    const userMsg: Message = { role: 'user', content: prompt };
    const assistantMsgIndex = messages.length + 1;
    const initialAssistantMsg: Message = {
      role: 'assistant',
      isStreaming: true,
      status: 'Thinking…',
      traces: [],
      startTime,
    };

    const newMessages = [...messages, userMsg, initialAssistantMsg];
    setMessages(newMessages);
    setIsStreaming(true);

    try {
      // Extract transcript (role and content only)
      const transcript = buildTranscript(newMessages);

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messages: transcript }),
      });

      if (!res.ok) {
        let errJson;
        try {
          errJson = await res.json();
        } catch {
          errJson = { message: `HTTP Error ${res.status}` };
        }
        setMessages((prev) => {
          const updated = [...prev];
          updated[assistantMsgIndex] = {
            role: 'assistant',
            error: errJson.message || 'Failed to process request',
            startTime,
          };
          return updated;
        });
        setIsStreaming(false);
        return;
      }

      if (!res.body) {
        throw new Error('No body in response');
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let currentStatus = 'Thinking…';
      const accumulatedTraces: ChatTrace[] = [];
      // Must survive chunk boundaries: an `event:` line and its `data:` line can
      // arrive in different reads. Reset only on the blank line that ends an event.
      let eventName = 'message';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) {
            eventName = 'message'; // end of one SSE event
            continue;
          }
          if (trimmed.startsWith(':')) continue; // Heartbeat comment

          if (trimmed.startsWith('event:')) {
            eventName = trimmed.substring(6).trim();
            continue;
          }

          if (trimmed.startsWith('data:')) {
            const dataStr = trimmed.substring(5).trim();
            try {
              const data = JSON.parse(dataStr);

              if (eventName === 'status') {
                currentStatus = data.status || currentStatus;
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[assistantMsgIndex] = {
                    ...updated[assistantMsgIndex],
                    status: currentStatus,
                    traces: [...accumulatedTraces],
                    startTime,
                  };
                  return updated;
                });
              } else if (eventName === 'trace') {
                accumulatedTraces.push(data);
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[assistantMsgIndex] = {
                    ...updated[assistantMsgIndex],
                    traces: [...accumulatedTraces],
                    startTime,
                  };
                  return updated;
                });
              } else if (eventName === 'final') {
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[assistantMsgIndex] = {
                    role: 'assistant',
                    content: data.answer,
                    clarify: data.clarify,
                    clarifyOptions: data.clarifyOptions,
                    blocks: data.blocks,
                    traces: accumulatedTraces,
                    isStreaming: false,
                    startTime,
                  };
                  return updated;
                });
              } else if (eventName === 'error') {
                setMessages((prev) => {
                  const updated = [...prev];
                  updated[assistantMsgIndex] = {
                    role: 'assistant',
                    error: data.message || 'Error occurred during processing',
                    traces: accumulatedTraces,
                    isStreaming: false,
                    startTime,
                  };
                  return updated;
                });
              }
            } catch (err) {
              console.error('Failed to parse SSE event data', err);
            }
          }
        }
      }

      // Stream ended without a final/error event (server timeout, dropped connection):
      // don't leave the bubble spinning forever.
      setMessages((prev) => {
        const updated = [...prev];
        const msg = updated[assistantMsgIndex];
        if (msg && msg.isStreaming) {
          updated[assistantMsgIndex] = {
            role: 'assistant',
            error:
              'The stream ended before an answer arrived. Please try again.',
            traces: accumulatedTraces,
            isStreaming: false,
            startTime,
          };
        }
        return updated;
      });
    } catch (err) {
      setMessages((prev) => {
        const updated = [...prev];
        updated[assistantMsgIndex] = {
          role: 'assistant',
          error: err instanceof Error ? err.message : 'Network error occurred',
          startTime,
        };
        return updated;
      });
    } finally {
      setIsStreaming(false);
    }
  };

  const lastMessage = messages[messages.length - 1];
  const awaitingClarify =
    !isStreaming &&
    lastMessage?.role === 'assistant' &&
    Boolean(lastMessage.clarify);

  return (
    <div className="bui-chat relative flex h-screen max-h-screen flex-col bg-[var(--canvas)] -m-0 md:-m-6 lg:-mt-6 overflow-hidden">
      {/* Header */}
      <header className="flex h-14 shrink-0 items-center justify-between px-6 border-[var(--line)]">
        {messages.length > 0 ? (
          <>
            <h1 className="text-sm font-semibold tracking-tight text-[var(--ink)]">
              Chat with Your Data
            </h1>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleClearChat}
              className="gap-1.5"
            >
              <Plus className="size-3.5" />
              <span>New Chat</span>
            </Button>
          </>
        ) : (
          <div className="flex-1" />
        )}
      </header>

      {/* Main Transcript Container */}
      <main
        ref={containerRef}
        className="flex-1 overflow-y-auto px-4 py-4"
      >
        <div className="mx-auto max-w-3xl space-y-3">
          {messages.length === 0 ? (
            <EmptyState onSelectPrompt={handleSendPrompt} />
          ) : (
            (() => {
              const lastAssistantIndex = messages
                .map((m) => m.role)
                .lastIndexOf('assistant');
              return messages.map((msg, index) => (
                <div key={index}>
                  {msg.role === 'user' ? (
                    <UserBubble content={msg.content} />
                  ) : (
                    <AssistantMessage
                      msg={msg}
                      isExpanded={Boolean(expandedTraces[index])}
                      onToggleTrace={() => toggleTrace(index)}
                      isLastAssistant={index === lastAssistantIndex}
                      isAnyStreaming={isStreaming}
                      onSelectFollowUp={handleSendPrompt}
                      onDraftStateChange={(update) =>
                        handleDraftStateChange(index, update)
                      }
                    />
                  )}
                </div>
              ));
            })()
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Modern Input Composer */}
      <Composer
        input={input}
        setInput={setInput}
        isStreaming={isStreaming}
        onSend={handleSend}
        awaitingClarify={awaitingClarify}
      />
    </div>
  );
}


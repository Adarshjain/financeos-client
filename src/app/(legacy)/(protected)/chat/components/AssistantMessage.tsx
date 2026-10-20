'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { Message } from './chat.types';
import { ChatChartCard } from './ChatChartCard';
import { ChatDataTable } from './ChatDataTable';
import { ChatReportDraftCard } from './ChatReportDraftCard';
import { ChatStatCards } from './ChatStatCards';
import { FollowUpChips } from './FollowUpChips';
import { LiveTraceFeed } from './LiveTraceFeed';
import { StreamingCaret } from './StreamingCaret';
import { ThinkingIndicator } from './ThinkingIndicator';
import { TracePanel } from './TracePanel';

interface AssistantMessageProps {
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
}

export function AssistantMessage({
  msg,
  isExpanded,
  onToggleTrace,
  isLastAssistant,
  isAnyStreaming,
  onSelectFollowUp,
  onDraftStateChange,
}: AssistantMessageProps) {
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
      msg.blocks.followUps.length > 0
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

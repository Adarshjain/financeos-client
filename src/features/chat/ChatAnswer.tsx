'use client';

import React from 'react';

import { Banner } from '@/components/ds/Banner/Banner';
import { Button } from '@/components/ds/Button/Button';
import { FilterChip } from '@/components/ds/FilterChip/FilterChip';
import { Icon } from '@/components/ds/Icon/Icon';
import { KpiTile } from '@/components/ds/KpiTile/KpiTile';
import { StepList, type StepListStep } from '@/components/ds/StepList/StepList';
import { Text } from '@/components/ds/Text/Text';

import { answerText, type AssistantRecord, metaLine, stepLabel, stepMeta } from './answerModel';
import { ChatChartCard } from './ChatChartCard';
import { ChatMarkdown } from './ChatMarkdown';
import { ChatReportDraftSlot } from './ChatReportDraftSlot';
import { ChatTableCard } from './ChatTableCard';
import { copyText } from './copyText';
import { CHAT_BUSY_MESSAGE } from './useConversation';

export interface ChatAnswerProps {
  record: AssistantRecord;
  conversationId: string | null;
  /** The last answer of the chat: only it offers Ask again, Retry, follow-ups and clarify options. */
  last: boolean;
  busy: boolean;
  onSend: (question: string) => void;
  onAskAgain: () => void;
}

function liveSteps(record: AssistantRecord): StepListStep[] {
  const running = record.status === 'running';
  const steps: StepListStep[] = record.steps.map((s, i) => ({
    id: String(i),
    label: stepLabel(s),
    meta: stepMeta(s),
    state: s.success === false ? 'failed' : running && i === record.steps.length - 1 ? 'running' : 'done',
  }));
  if (running && steps.length === 0 && record.statusText) {
    steps.push({ id: 'status', label: record.statusText, state: 'running' });
  }
  return steps;
}

function cardSteps(record: AssistantRecord): StepListStep[] {
  return record.steps.map((s, i) => ({
    id: String(i),
    label: stepLabel(s),
    meta: stepMeta(s),
    state: s.success === false ? 'failed' : 'done',
    detail: s.success === false ? s.error : undefined,
    code: s.detail ?? undefined,
  }));
}

/** One assistant answer: what it shows depends on whether it is running, stopped, failed or complete. */
export function ChatAnswer({ record, conversationId, last, busy, onSend, onAskAgain }: ChatAnswerProps) {
  const [stepsOpen, setStepsOpen] = React.useState(false);
  const { blocks } = record;

  if (record.status === 'running') {
    const steps = liveSteps(record);
    return steps.length > 0 ? <StepList variant="live" steps={steps} /> : null;
  }

  const stopped = record.status === 'STOPPED';
  const failed = record.status === 'FAILED';
  const text = answerText(record);
  const stats = blocks?.stats ?? [];
  const copyAnswer = () => {
    void copyText(text, 'Answer copied');
  };

  return (
    <div className="flex flex-col gap-space-8 desk:gap-space-12 min-w-0">
      {stats.length > 0 ? (
        <div className={stats.length >= 4 ? 'grid grid-cols-2 desk:grid-cols-4 gap-x-space-12 gap-y-space-8 desk:gap-y-space-12' : 'grid grid-cols-2 desk:grid-cols-3 gap-x-space-12 gap-y-space-8 desk:gap-y-space-12'}>
          {stats.map((s, i) => (
            <KpiTile
              key={i}
              label={s.label}
              value={s.value}
              delta={s.delta ? { value: s.delta, direction: s.sentiment ?? 'neutral' } : undefined}
            />
          ))}
        </div>
      ) : null}

      {record.answer ? <ChatMarkdown>{record.answer}</ChatMarkdown> : null}

      {(blocks?.charts ?? []).map((chart, i) => (
        <ChatChartCard key={i} chart={chart} />
      ))}

      {(blocks?.tables ?? []).filter((t) => t.columns?.length && t.rows?.length).map((table, i) => (
        <ChatTableCard key={i} table={table} />
      ))}

      {blocks?.reportDraft ? (
        <ChatReportDraftSlot
          draft={blocks.reportDraft}
          draftResult={record.draftResult}
          conversationId={conversationId}
          messageId={record.messageId}
        />
      ) : null}

      {record.clarify ? (
        <>
          <Text variant="body-strong" as="p">
            {record.clarify}
          </Text>
          {last && !busy && record.clarifyOptions?.length ? (
            <div className="flex flex-wrap gap-space-8">
              {record.clarifyOptions.map((option) => (
                <FilterChip key={option} onClick={() => onSend(option)}>
                  {option}
                </FilterChip>
              ))}
            </div>
          ) : null}
        </>
      ) : null}

      {stopped || record.steps.length > 0 || (!failed && text) ? (
        <div className="flex flex-col gap-space-8">
          <div className="flex items-center gap-space-8">
            {stopped || record.steps.length > 0 ? (
              <Text variant="caption" tone="ink-3" as="p" className="min-w-0">
                {stopped ? 'Stopped' : metaLine(record)}
                {record.steps.length > 0 ? (
                  <>
                    {' · '}
                    <Button variant="link" onClick={() => setStepsOpen((v) => !v)}>
                      {stepsOpen ? 'Hide steps' : 'Show steps'}
                    </Button>
                  </>
                ) : null}
              </Text>
            ) : null}
            {!failed ? (
              <div className="ml-auto flex items-center gap-space-4">
                {text ? (
                  <Button variant="ghost" size="sm" iconOnly title="Copy answer" onClick={copyAnswer} icon={<Icon name="copy" size="sm" />} />
                ) : null}
                {last && !busy ? (
                  <Button variant="ghost" size="sm" iconOnly title="Ask again" onClick={onAskAgain} icon={<Icon name="arrow-clockwise" size="sm" />} />
                ) : null}
              </div>
            ) : null}
          </div>
          {stepsOpen ? <StepList variant="card" steps={cardSteps(record)} showCodeLabel="Show query" hideCodeLabel="Hide query" /> : null}
        </div>
      ) : null}

      {failed ? (
        <Banner
          tone={record.error === CHAT_BUSY_MESSAGE ? 'info' : 'danger'}
          action={last && !busy ? { label: 'Retry', onSelect: onAskAgain } : undefined}
        >
          {record.error}
        </Banner>
      ) : null}

      {last && !busy && !failed && blocks?.followUps?.length ? (
        <div className="flex flex-wrap gap-space-8">
          {blocks.followUps.map((q) => (
            <FilterChip key={q} onClick={() => onSend(q)}>
              {q}
            </FilterChip>
          ))}
        </div>
      ) : null}
    </div>
  );
}

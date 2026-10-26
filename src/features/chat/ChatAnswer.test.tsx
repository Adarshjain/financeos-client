import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { AssistantRecord } from './answerModel';
import { ChatAnswer, type ChatAnswerProps } from './ChatAnswer';
import { CHAT_BUSY_MESSAGE, CHAT_FAILED_MESSAGE } from './useConversation';

const toast = vi.fn();
vi.mock('@/components/ds/Toast/Toast', async (orig) => ({
  ...(await orig<typeof import('@/components/ds/Toast/Toast')>()),
  showToast: (...args: unknown[]) => toast(...args),
}));
vi.mock('./ChatReportDraftSlot', () => ({
  ChatReportDraftSlot: (p: { draft: { name: string }; conversationId: string; messageId: string }) => <div>{`draft slot: ${p.draft.name} ${p.conversationId} ${p.messageId}`}</div>,
}));
vi.mock('@/components/organisms', () => ({ Chart: ({ data }: { data: { chartType: string } }) => <div>chart:{data.chartType}</div> }));

const writeText = vi.fn(() => Promise.resolve());
beforeEach(() => {
  vi.clearAllMocks();
  Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true });
});

const step = { action: 'run_sql', label: 'Queried your transactions', summary: 'Ran a query', detail: 'SELECT 1', rowCount: 1284, durationMs: 1600, success: true };

const record = (over: Partial<AssistantRecord> = {}): AssistantRecord => ({
  kind: 'assistant',
  id: 'a1',
  status: 'COMPLETE',
  steps: [step],
  durationMs: 4200,
  answer: 'You spent **₹1,84,320** in total.',
  ...over,
});

function setup(over: Partial<AssistantRecord> = {}, props: Partial<ChatAnswerProps> = {}) {
  const onSend = vi.fn();
  const onAskAgain = vi.fn();
  render(<ChatAnswer record={record(over)} conversationId="c1" last busy={false} onSend={onSend} onAskAgain={onAskAgain} {...props} />);
  return { onSend, onAskAgain };
}

describe('ChatAnswer, blocks in board order', () => {
  it('draws stats, prose, chart and table, then the meta line', () => {
    setup({
      blocks: {
        stats: [{ label: 'Spent · 90 days', value: '₹1,84,320', delta: '+8% vs before', sentiment: 'bad' }],
        charts: [{ chartType: 'bar', title: 'Spend by week', categories: ['a'], series: [{ name: 's', data: [1] }] }],
        tables: [{ title: 'Where it went', columns: [{ key: 'c', label: 'Category' }], rows: [{ c: 'Food' }] }],
      },
    });
    const text = document.body.textContent ?? '';
    const at = (s: string) => text.indexOf(s);
    expect(at('Spent · 90 days')).toBeGreaterThan(-1);
    expect(at('Spent · 90 days')).toBeLessThan(at('You spent'));
    expect(at('You spent')).toBeLessThan(at('Spend by week'));
    expect(at('Spend by week')).toBeLessThan(at('Where it went'));
    expect(at('Where it went')).toBeLessThan(at('Ran 1 query'));
    expect(screen.getByText('chart:bar')).toBeInTheDocument();
    expect(screen.getByText('₹1,84,320', { selector: 'strong' })).toBeInTheDocument();
    expect(screen.getByText('+8% vs before')).toBeInTheDocument();
    expect(screen.getByText('1 row')).toBeInTheDocument();
  });

  it('renders markdown lists and inline code through Text', () => {
    setup({ answer: '- one\n- two\n\nUse `v_chat`.' });
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
    expect(screen.getByText('v_chat').tagName).toBe('CODE');
  });

  it('hands a report draft to the draft slot, with the conversation and message', () => {
    setup({ messageId: 'm1', blocks: { reportDraft: { mode: 'create', name: 'Monthly spend' } } });
    expect(screen.getByText('draft slot: Monthly spend c1 m1')).toBeInTheDocument();
    expect(screen.getByText(/You spent/)).toBeInTheDocument();
  });
});

describe('Copy table', () => {
  it('copies headers and rows as tab-separated text and says so', async () => {
    setup({
      blocks: {
        tables: [
          {
            title: 'Where it went',
            columns: [
              { key: 'c', label: 'Category' },
              { key: 's', label: 'Spent', format: 'inr' },
            ],
            rows: [{ c: 'Food', s: 42180 }],
          },
        ],
      },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Copy table' }));
    expect(writeText).toHaveBeenCalledWith('Category\tSpent\nFood\t₹42,180');
    await vi.waitFor(() => expect(toast).toHaveBeenCalledWith('Table copied'));
  });
});

describe('meta line and steps', () => {
  it('says how many queries ran and for how long, and toggles the steps', () => {
    setup();
    expect(screen.getByText(/Ran 1 query · 4\.2 s/)).toBeInTheDocument();
    expect(screen.queryByText('Queried your transactions')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Show steps' }));
    expect(screen.getByText('Queried your transactions')).toBeInTheDocument();
    expect(screen.getByText('1,284 rows · 1.6 s')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Show query' }));
    expect(screen.getByText('SELECT 1')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Hide steps' }));
    expect(screen.queryByText('Queried your transactions')).toBeNull();
  });

  it('shows a failed step with its error', () => {
    setup({ steps: [{ ...step, success: false, error: 'Column x does not exist' }] });
    fireEvent.click(screen.getByRole('button', { name: 'Show steps' }));
    expect(screen.getByText('Column x does not exist')).toBeInTheDocument();
  });

  it('Copy answer copies the prose and says so', async () => {
    setup();
    fireEvent.click(screen.getByTitle('Copy answer'));
    expect(writeText).toHaveBeenCalledWith('You spent **₹1,84,320** in total.');
    await vi.waitFor(() => expect(toast).toHaveBeenCalledWith('Answer copied'));
  });
});

describe('Ask again', () => {
  it('is offered on the last answer when not busy', () => {
    const { onAskAgain } = setup();
    fireEvent.click(screen.getByTitle('Ask again'));
    expect(onAskAgain).toHaveBeenCalled();
  });

  it('is not offered on an earlier answer or while busy', () => {
    const { unmount } = render(<ChatAnswer record={record()} conversationId="c1" last={false} busy={false} onSend={vi.fn()} onAskAgain={vi.fn()} />);
    expect(screen.queryByTitle('Ask again')).toBeNull();
    expect(screen.getByTitle('Copy answer')).toBeInTheDocument();
    unmount();
    render(<ChatAnswer record={record()} conversationId="c1" last busy onSend={vi.fn()} onAskAgain={vi.fn()} />);
    expect(screen.queryByTitle('Ask again')).toBeNull();
  });
});

describe('follow-ups and clarify', () => {
  it('sends a follow-up chip, on the last answer only', () => {
    const blocks = { followUps: ['Top 10 merchants'] };
    const { onSend } = setup({ blocks });
    fireEvent.click(screen.getByRole('button', { name: 'Top 10 merchants' }));
    expect(onSend).toHaveBeenCalledWith('Top 10 merchants');
  });

  it('hides follow-ups on an earlier answer', () => {
    render(<ChatAnswer record={record({ blocks: { followUps: ['Top 10 merchants'] } })} conversationId="c1" last={false} busy={false} onSend={vi.fn()} onAskAgain={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Top 10 merchants' })).toBeNull();
  });

  it('asks the question with the options as buttons that send the option', () => {
    const { onSend } = setup({ answer: undefined, clarify: 'Which period do you mean?', clarifyOptions: ['This month', 'All time'], steps: [] });
    expect(screen.getByText('Which period do you mean?')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'All time' }));
    expect(onSend).toHaveBeenCalledWith('All time');
  });
});

describe('states', () => {
  it('shows live steps with the last one running', () => {
    setup({ status: 'running', answer: undefined, steps: [{ ...step, label: 'Looked at your cards' }, { ...step, label: 'Comparing rewards' }] });
    expect(screen.getByText('Looked at your cards')).toBeInTheDocument();
    expect(screen.getByText('Comparing rewards')).toBeInTheDocument();
    expect(screen.queryByText(/Ran 1 query/)).toBeNull();
  });

  it('falls back to the status text before the first step', () => {
    setup({ status: 'running', answer: undefined, steps: [], statusText: 'Reading transactions' });
    expect(screen.getByText('Reading transactions')).toBeInTheDocument();
  });

  it('reads Stopped · Show steps for a stopped answer, keeps its steps and offers Ask again on the last one', () => {
    const { onAskAgain } = setup({ status: 'STOPPED', answer: undefined, steps: [{ ...step, label: 'Looked at your cards' }] });
    expect(screen.getByText(/^Stopped/)).toBeInTheDocument();
    expect(screen.queryByText('Looked at your cards')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Show steps' }));
    expect(screen.getByText('Looked at your cards')).toBeInTheDocument();
    fireEvent.click(screen.getByTitle('Ask again'));
    expect(onAskAgain).toHaveBeenCalled();
  });

  it('shows just Stopped when a stopped answer has no steps, and no Ask again on an earlier one', () => {
    render(<ChatAnswer record={record({ status: 'STOPPED', answer: undefined, steps: [] })} conversationId="c1" last={false} busy={false} onSend={vi.fn()} onAskAgain={vi.fn()} />);
    expect(screen.getByText('Stopped')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Show steps' })).toBeNull();
    expect(screen.queryByTitle('Ask again')).toBeNull();
  });

  it('shows the did-not-finish banner with Retry, and the meta line for the steps that ran', () => {
    const { onAskAgain } = setup({ status: 'FAILED', answer: undefined, error: CHAT_FAILED_MESSAGE });
    expect(screen.getByText(CHAT_FAILED_MESSAGE)).toBeInTheDocument();
    expect(screen.getByText(/Ran 1 query/)).toBeInTheDocument();
    expect(screen.queryByTitle('Copy answer')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onAskAgain).toHaveBeenCalled();
  });

  it('shows the busy copy with Retry', () => {
    const { onAskAgain } = setup({ status: 'FAILED', answer: undefined, steps: [], error: CHAT_BUSY_MESSAGE });
    expect(screen.getByText(CHAT_BUSY_MESSAGE)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(onAskAgain).toHaveBeenCalled();
  });

  it('offers no Retry on an earlier failed answer', () => {
    render(<ChatAnswer record={record({ status: 'FAILED', error: CHAT_FAILED_MESSAGE })} conversationId="c1" last={false} busy={false} onSend={vi.fn()} onAskAgain={vi.fn()} />);
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
  });
});

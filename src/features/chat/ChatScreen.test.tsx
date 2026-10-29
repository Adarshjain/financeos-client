import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { ChatRecord, Conversation, ConversationSummary } from './conversation.types';

const router = vi.hoisted(() => ({ push: vi.fn(), back: vi.fn() }));
const nav = vi.hoisted(() => ({ pathname: '/chat' }));
vi.mock('next/navigation', () => ({ useRouter: () => router, usePathname: () => nav.pathname }));
vi.mock('@/lib/query/hooks/useNotifications', () => ({
  useNotificationSummary: () => ({ data: { unread: 0 } }),
  useNotificationFeed: () => ({ data: undefined, isLoading: false, error: null, refetch: vi.fn() }),
  useNotificationMutations: () => ({ markRead: { mutate: vi.fn() } }),
}));
vi.mock('@/components/organisms', async (orig) => ({ ...(await orig<typeof import('@/components/organisms')>()), Chart: () => <div>chart</div> }));

const actions = vi.hoisted(() => ({ rename: vi.fn(), remove: vi.fn() }));
vi.mock('./conversationActions', () => ({ renameConversation: actions.rename, deleteConversation: actions.remove }));

const convo = vi.hoisted(() => ({
  state: { records: [] as ChatRecord[], busy: false, conversationId: null as string | null, title: null as string | null },
  send: vi.fn(),
  stop: vi.fn(),
  retry: vi.fn(),
  options: {} as { onConversationCreated?: (id: string) => void; onQuestionSent?: () => void; onTitle?: (t: string) => void },
}));
vi.mock('./useConversation', () => ({
  CHAT_BUSY_MESSAGE: 'busy',
  CHAT_FAILED_MESSAGE: 'failed',
  useConversation: (options: typeof convo.options) => {
    convo.options = options;
    return { ...convo.state, send: convo.send, stop: convo.stop, retry: convo.retry };
  },
}));

import { ChatScreen } from './ChatScreen';

const summary = (id: string, title: string | null, questionCount = 1): ConversationSummary => ({
  id,
  title,
  createdAt: '2026-10-26T08:35:00Z',
  updatedAt: '2026-10-26T08:35:00Z',
  questionCount,
});

const stored: Conversation = { id: 'c1', title: 'Spend', createdAt: '', updatedAt: '', messages: [] };

beforeEach(() => {
  vi.clearAllMocks();
  nav.pathname = '/chat';
  convo.state = { records: [], busy: false, conversationId: null, title: null };
  convo.send.mockResolvedValue(undefined);
  actions.rename.mockResolvedValue({ success: true, data: { title: 'Renamed' } });
  actions.remove.mockResolvedValue({ success: true, data: undefined });
});

const props = { conversations: [summary('c1', 'Spend in the last 90 days', 2)], today: '2026-10-26' };

describe('ChatScreen, a new chat', () => {
  it('shows the headline, the composer and the six starters with their categories', () => {
    render(<ChatScreen {...props} />);
    expect(screen.getByRole('heading', { name: 'What do you want to know?' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Ask about your money…')).toBeInTheDocument();
    for (const c of ['Spending', 'Cards', 'Net worth', 'Investments', 'Lending', 'Reports']) expect(screen.getByText(c)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Who still owes me money, and how much\?/ })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Make a report of my monthly spend by category\./ })).toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: /^(SPENDING|CARDS|NET WORTH|INVESTMENTS|LENDING|REPORTS|Spending|Cards|Net worth|Investments|Lending|Reports)/ })).toHaveLength(6);
  });

  it('sends a starter when it is clicked', () => {
    render(<ChatScreen {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /Which credit card gives the best rewards/ }));
    expect(convo.send).toHaveBeenCalledWith('Which credit card gives the best rewards for ₹5,000 dining?');
  });

  it('sends what is typed on Enter', () => {
    render(<ChatScreen {...props} />);
    const field = screen.getByPlaceholderText('Ask about your money…');
    fireEvent.change(field, { target: { value: 'How much on fuel?' } });
    fireEvent.keyDown(field, { key: 'Enter' });
    expect(convo.send).toHaveBeenCalledWith('How much on fuel?');
  });

  it('has the Ask the data title, Insights crumb, a back to Reports and a + that starts a new chat', () => {
    render(<ChatScreen {...props} />);
    expect(screen.getByText('Insights')).toBeInTheDocument();
    expect(screen.getAllByText('Ask the data').length).toBeGreaterThan(0);
    expect(screen.getByRole('link', { name: 'New chat' })).toHaveAttribute('href', '/chat');
  });

  it('sends ?q= once on mount, also when React runs the effect twice', () => {
    render(
      <React.StrictMode>
        <ChatScreen {...props} autoSend="spend this month" />
      </React.StrictMode>,
    );
    expect(convo.send).toHaveBeenCalledTimes(1);
    expect(convo.send).toHaveBeenCalledWith('spend this month');
  });

  it('sends nothing on its own without ?q=', () => {
    render(<ChatScreen {...props} />);
    expect(convo.send).not.toHaveBeenCalled();
  });
});

describe('ChatScreen, history', () => {
  it('lists the recent chats with the open one highlighted', () => {
    convo.state = { ...convo.state, conversationId: 'c1', records: [{ kind: 'user', id: 'u', text: 'hi' }] };
    render(<ChatScreen {...props} initial={stored} />);
    expect(screen.getAllByText('Spend in the last 90 days').length).toBeGreaterThan(0);
  });

  it('puts a created chat on top, moves the URL without a reload and fills in the title', () => {
    const replace = vi.spyOn(window.history, 'replaceState');
    const { rerender } = render(<ChatScreen {...props} />);
    act(() => convo.options.onConversationCreated?.('c9'));
    expect(replace).toHaveBeenCalledWith(null, '', '/chat/c9');
    convo.state = { ...convo.state, conversationId: 'c9', records: [{ kind: 'user', id: 'u', text: 'hi' }] };
    rerender(<ChatScreen {...props} />);
    expect(screen.getAllByText('New chat').length).toBeGreaterThan(0);
    act(() => convo.options.onTitle?.('Fuel spend'));
    expect(screen.getAllByText('Fuel spend').length).toBeGreaterThan(1); // the top bar and the pane row
    replace.mockRestore();
  });

  it('a question in a chat that exists adds to its count', () => {
    convo.state = { ...convo.state, conversationId: 'c1', records: [{ kind: 'user', id: 'u', text: 'hi' }] };
    render(<ChatScreen {...props} initial={stored} />);
    expect(screen.getByText(/2 questions/)).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText('Ask about your money…'), { target: { value: 'And?' } });
    fireEvent.keyDown(screen.getByPlaceholderText('Ask about your money…'), { key: 'Enter' });
    expect(convo.send).toHaveBeenCalledWith('And?');
    // The hook says a question went out; only then does the count rise.
    expect(screen.getByText(/2 questions/)).toBeInTheDocument();
    act(() => convo.options.onQuestionSent?.());
    expect(screen.getByText(/3 questions/)).toBeInTheDocument();
  });

  it('does not rewrite the URL when the visitor has left the page the chat started on, but still lists the chat', () => {
    const replace = vi.spyOn(window.history, 'replaceState');
    render(<ChatScreen {...props} />);
    window.history.pushState(null, '', '/somewhere-else');
    act(() => convo.options.onConversationCreated?.('c9'));
    expect(replace).not.toHaveBeenCalled();
    expect(screen.getAllByText('New chat').length).toBeGreaterThan(0);
    replace.mockRestore();
    window.history.pushState(null, '', '/');
  });

  it('keeps at most ten chats when a new one is created', () => {
    const many = Array.from({ length: 10 }, (_, i) => summary(`o${i}`, `Old ${i}`));
    render(<ChatScreen conversations={many} today="2026-10-26" />);
    act(() => convo.options.onConversationCreated?.('new'));
    expect(screen.queryByText('Old 9')).toBeNull();
    expect(screen.getByText('Old 8')).toBeInTheDocument();
  });

  it('renames a chat and updates its row', async () => {
    render(<ChatScreen {...props} />);
    await userEvent.click(screen.getByRole('button', { name: 'More options' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Rename' }));
    fireEvent.change(await screen.findByRole('textbox', { name: 'Name' }), { target: { value: 'Renamed' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save name' }));
    await waitFor(() => expect(actions.rename).toHaveBeenCalledWith('c1', 'Renamed'));
    expect(await screen.findByText('Renamed')).toBeInTheDocument();
  });

  it('deleting the open chat goes to a new chat', async () => {
    convo.state = { ...convo.state, conversationId: 'c1', records: [{ kind: 'user', id: 'u', text: 'hi' }] };
    render(<ChatScreen {...props} initial={stored} />);
    await userEvent.click(screen.getByRole('button', { name: 'More options' }));
    await userEvent.click(await screen.findByRole('menuitem', { name: 'Delete chat' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Delete chat' }));
    await waitFor(() => expect(actions.remove).toHaveBeenCalledWith('c1'));
    await waitFor(() => expect(router.push).toHaveBeenCalledWith('/chat'));
  });
});

describe('ChatScreen, a conversation', () => {
  const records: ChatRecord[] = [
    { kind: 'user', id: 'u1', text: 'Where did my money go?', createdAt: '2026-10-26T08:35:00Z' },
    { kind: 'assistant', id: 'a1', status: 'COMPLETE', steps: [], answer: 'On food.' },
    { kind: 'user', id: 'u2', text: 'And on travel?', createdAt: '2026-10-26T08:37:00Z' },
    { kind: 'assistant', id: 'a2', status: 'COMPLETE', steps: [], answer: 'On trains.' },
  ];

  it('draws each question with its IST time under it and each answer', () => {
    convo.state = { ...convo.state, conversationId: 'c1', title: 'Spend', records };
    render(<ChatScreen {...props} initial={stored} />);
    expect(screen.getByText('Where did my money go?')).toBeInTheDocument();
    expect(screen.getByText('14:05')).toBeInTheDocument();
    expect(screen.getByText('14:07')).toBeInTheDocument();
    expect(screen.getByText('On food.')).toBeInTheDocument();
    expect(screen.getByText('On trains.')).toBeInTheDocument();
  });

  it('puts the chat title in the top bar, goes back to a new chat', () => {
    convo.state = { ...convo.state, conversationId: 'c1', title: 'Spend', records };
    render(<ChatScreen {...props} initial={stored} />);
    expect(screen.getAllByText('Spend in the last 90 days').length).toBeGreaterThan(1);
    fireEvent.click(screen.getByRole('link', { name: 'Back' }));
    expect(router.push).toHaveBeenCalledWith('/chat');
  });

  it('shows Stop and the hint while answering, and Stop stops', () => {
    convo.state = {
      ...convo.state,
      busy: true,
      conversationId: 'c1',
      records: [records[0], { kind: 'assistant', id: 'a', status: 'running', steps: [] }],
    };
    render(<ChatScreen {...props} initial={stored} />);
    expect(screen.getByText('Answering · you can type the next question')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Ask a follow-up…')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Stop' }));
    expect(convo.stop).toHaveBeenCalled();
  });

  it('asks Pick one, or type your own answer… under a clarifying question', () => {
    convo.state = {
      ...convo.state,
      conversationId: 'c1',
      records: [records[0], { kind: 'assistant', id: 'a', status: 'COMPLETE', steps: [], clarify: 'Which period?', clarifyOptions: ['This month'] }],
    };
    render(<ChatScreen {...props} initial={stored} />);
    expect(screen.getByPlaceholderText('Pick one, or type your own answer…')).toBeInTheDocument();
  });

  it('Retry on a failed last answer calls retry', () => {
    convo.state = {
      ...convo.state,
      conversationId: 'c1',
      records: [records[0], { kind: 'assistant', id: 'a', status: 'FAILED', steps: [], error: 'The answer did not finish. Your question is kept.' }],
    };
    render(<ChatScreen {...props} initial={stored} />);
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    expect(convo.retry).toHaveBeenCalled();
  });

  it('starts a fresh session when the path goes back to a new chat', () => {
    convo.state = { ...convo.state, conversationId: 'c1', records };
    nav.pathname = '/chat/c1';
    const { rerender } = render(<ChatScreen {...props} initial={stored} />);
    expect(screen.getByText('On food.')).toBeInTheDocument();
    convo.state = { ...convo.state, conversationId: null, records: [] };
    nav.pathname = '/chat';
    rerender(<ChatScreen {...props} />);
    expect(screen.getByRole('heading', { name: 'What do you want to know?' })).toBeInTheDocument();
  });
});

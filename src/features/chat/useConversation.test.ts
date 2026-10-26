import { act, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const notify = vi.hoisted(() => vi.fn());
vi.mock('./chatNotifications', () => ({ notifyChatComplete: notify }));
vi.mock('@/lib/browserNotifications', () => ({ ensureNotificationPermission: vi.fn() }));

import type { Conversation } from './conversation.types';
import { CHAT_BUSY_MESSAGE, CHAT_FAILED_MESSAGE, useConversation } from './useConversation';

const enc = new TextEncoder();
const sse = (event: string, data: unknown) => `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;

function streamOf(chunks: string[]): Response {
  return new Response(
    new ReadableStream({
      start(c) {
        chunks.forEach((x) => c.enqueue(enc.encode(x)));
        c.close();
      },
    }),
    { status: 200 },
  );
}

/** A stream the test feeds by hand; aborting the request errors the reader like a real fetch. */
function openStream(signal: AbortSignal) {
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  const body = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
    },
  });
  signal.addEventListener('abort', () => controller.error(new DOMException('aborted', 'AbortError')));
  return { res: new Response(body, { status: 200 }), push: (t: string) => controller.enqueue(enc.encode(t)) };
}

const fetchMock = vi.fn();
const lastBody = () => JSON.parse(fetchMock.mock.calls.at(-1)![1].body);

beforeEach(() => {
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => {
  fetchMock.mockReset();
  notify.mockClear();
  vi.unstubAllGlobals();
});

const happy = [
  sse('conversation', { id: 'c1' }),
  sse('status', { status: 'Reading transactions' }),
  sse('trace', { action: 'run_sql', label: 'Checked spend', summary: 's', rowCount: 3, success: true }),
  sse('final', { answer: 'Rs 100', messageId: 'm2', conversationId: 'c1', durationMs: 1200, blocks: { followUps: ['More?'] } }),
  sse('title', { conversationId: 'c1', title: 'Spend' }),
];

describe('useConversation', () => {
  it('starts a new conversation and maps every event into state', async () => {
    fetchMock.mockResolvedValue(streamOf(happy));
    const onConversationCreated = vi.fn();
    const onTitle = vi.fn();
    const { result } = renderHook(() => useConversation({ onConversationCreated, onTitle }));

    await act(() => result.current.send('  How much did I spend? '));

    expect(lastBody()).toEqual({ messages: [{ role: 'user', content: 'How much did I spend?' }], newConversation: true });
    expect(onConversationCreated).toHaveBeenCalledWith('c1');
    expect(onTitle).toHaveBeenCalledWith('Spend');
    expect(result.current.conversationId).toBe('c1');
    expect(result.current.title).toBe('Spend');
    expect(result.current.busy).toBe(false);
    expect(result.current.records[0]).toMatchObject({ kind: 'user', text: 'How much did I spend?' });
    expect(result.current.records[1]).toMatchObject({
      kind: 'assistant',
      status: 'COMPLETE',
      answer: 'Rs 100',
      messageId: 'm2',
      durationMs: 1200,
      blocks: { followUps: ['More?'] },
    });
    expect((result.current.records[1] as { steps: unknown[] }).steps).toHaveLength(1);
    expect(notify).toHaveBeenCalledWith({ answer: 'Rs 100', clarify: undefined });
  });

  it('shows live steps and status while running', async () => {
    let live!: ReturnType<typeof openStream>;
    fetchMock.mockImplementation(async (_u: string, init: RequestInit) => {
      live = openStream(init.signal as AbortSignal);
      return live.res;
    });
    const { result } = renderHook(() => useConversation());
    act(() => void result.current.send('q'));
    await waitFor(() => expect(live).toBeDefined());
    expect(result.current.busy).toBe(true);
    await act(async () => {
      live.push(sse('status', { status: 'Working' }) + sse('trace', { action: 'calc', summary: 'x', success: true }));
    });
    await waitFor(() =>
      expect(result.current.records[1]).toMatchObject({ status: 'running', statusText: 'Working', steps: [{ action: 'calc' }] }),
    );
  });

  it('sends follow-ups with the conversation id and treats clarify answers as plain sends', async () => {
    fetchMock.mockResolvedValueOnce(
      streamOf([sse('conversation', { id: 'c1' }), sse('final', { clarify: 'Which bank?', clarifyOptions: ['HDFC'], messageId: 'm2' })]),
    );
    const { result } = renderHook(() => useConversation());
    await act(() => result.current.send('balance?'));
    expect(result.current.records[1]).toMatchObject({ clarify: 'Which bank?', clarifyOptions: ['HDFC'] });
    expect(notify).toHaveBeenCalledWith({ answer: undefined, clarify: 'Which bank?' });

    fetchMock.mockResolvedValueOnce(streamOf([sse('final', { answer: 'ok', messageId: 'm4' })]));
    await act(() => result.current.send('HDFC'));
    expect(lastBody()).toEqual({ messages: [{ role: 'user', content: 'HDFC' }], conversationId: 'c1' });
    expect(result.current.records).toHaveLength(4);
  });

  it('ignores blank questions and sends while an answer is running', async () => {
    let live!: ReturnType<typeof openStream>;
    fetchMock.mockImplementation(async (_u: string, init: RequestInit) => {
      live = openStream(init.signal as AbortSignal);
      return live.res;
    });
    const { result } = renderHook(() => useConversation());
    await act(() => result.current.send('   '));
    expect(fetchMock).not.toHaveBeenCalled();
    act(() => void result.current.send('first'));
    await waitFor(() => expect(live).toBeDefined());
    await act(() => result.current.send('second'));
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('stop aborts the request and marks the running answer STOPPED, keeping its steps', async () => {
    let live!: ReturnType<typeof openStream>;
    fetchMock.mockImplementation(async (_u: string, init: RequestInit) => {
      live = openStream(init.signal as AbortSignal);
      return live.res;
    });
    const { result } = renderHook(() => useConversation());
    act(() => void result.current.send('q'));
    await waitFor(() => expect(live).toBeDefined());
    await act(async () => live.push(sse('trace', { action: 'run_sql', summary: 's', success: true })));
    await waitFor(() => expect((result.current.records[1] as { steps: unknown[] }).steps).toHaveLength(1));

    await act(async () => result.current.stop());
    await waitFor(() => expect(result.current.busy).toBe(false));
    expect(result.current.records[1]).toMatchObject({ status: 'STOPPED' });
    expect((result.current.records[1] as { steps: unknown[] }).steps).toHaveLength(1);
    expect(notify).not.toHaveBeenCalled();
  });

  it('retry re-runs the last question and replaces the last assistant record', async () => {
    fetchMock.mockResolvedValueOnce(streamOf([sse('conversation', { id: 'c1' }), sse('error', { code: 'X', message: 'boom', messageId: 'm2' })]));
    const { result } = renderHook(() => useConversation());
    await act(() => result.current.send('q'));
    expect(result.current.records[1]).toMatchObject({ status: 'FAILED', error: 'boom', messageId: 'm2' });

    fetchMock.mockResolvedValueOnce(streamOf([sse('final', { answer: 'fixed', messageId: 'm3' })]));
    await act(() => result.current.retry());
    expect(lastBody()).toEqual({ conversationId: 'c1', retry: true, messages: [] });
    expect(result.current.records).toHaveLength(2);
    expect(result.current.records[1]).toMatchObject({ status: 'COMPLETE', answer: 'fixed', messageId: 'm3' });
  });

  it('does nothing on retry without a conversation', async () => {
    const { result } = renderHook(() => useConversation());
    await act(() => result.current.retry());
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('retry of a first question that never reached the server asks it again as a new chat', async () => {
    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ code: 'CHAT_BUSY' }), { status: 429 }));
    const { result } = renderHook(() => useConversation());
    await act(() => result.current.send('first question'));
    expect(result.current.records[1]).toMatchObject({ status: 'FAILED' });

    fetchMock.mockResolvedValueOnce(streamOf(happy));
    await act(() => result.current.retry());
    expect(lastBody()).toEqual({ messages: [{ role: 'user', content: 'first question' }], newConversation: true });
    expect(result.current.records).toHaveLength(2);
    expect(result.current.records[1]).toMatchObject({ status: 'COMPLETE', answer: 'Rs 100' });
  });

  it('stamps a question with the time it was sent, and a stored one with its stored time', async () => {
    fetchMock.mockResolvedValue(streamOf(happy));
    const { result } = renderHook(() => useConversation());
    await act(() => result.current.send('q'));
    expect((result.current.records[0] as { createdAt?: string }).createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);

    const stored = renderHook(() =>
      useConversation({
        initial: {
          id: 'c9',
          title: 't',
          createdAt: '2026-10-26T08:35:00Z',
          updatedAt: '2026-10-26T08:35:00Z',
          messages: [{ id: 'u1', role: 'USER', createdAt: '2026-10-26T08:35:00Z', text: 'hi', draftResult: null }],
        },
      }),
    );
    expect(stored.result.current.records[0]).toMatchObject({ kind: 'user', createdAt: '2026-10-26T08:35:00Z' });
  });

  it('Retry after a failure before the server stored the question re-sends it, with no retry flag', async () => {
    fetchMock.mockResolvedValueOnce(streamOf(happy));
    const { result } = renderHook(() => useConversation());
    await act(() => result.current.send('Q1'));
    expect(result.current.records[1]).toMatchObject({ status: 'COMPLETE', stored: true });

    fetchMock.mockResolvedValueOnce(new Response(JSON.stringify({ code: 'CHAT_BUSY' }), { status: 429 }));
    await act(() => result.current.send('Q2'));
    expect(result.current.records[3]).toMatchObject({ status: 'FAILED', error: CHAT_BUSY_MESSAGE });
    expect(result.current.records[3]).not.toMatchObject({ stored: true });

    fetchMock.mockResolvedValueOnce(streamOf([sse('final', { answer: 'A2', messageId: 'm9' })]));
    await act(() => result.current.retry());
    expect(lastBody()).toEqual({ messages: [{ role: 'user', content: 'Q2' }], conversationId: 'c1' });
    expect(lastBody().retry).toBeUndefined();
    expect(result.current.records.map((r) => (r.kind === 'user' ? r.text : (r as { answer?: string }).answer))).toEqual(['Q1', 'Rs 100', 'Q2', 'A2']);
  });

  it('marks an answer stored once any event arrives, so a stream that fails after that retries with the flag', async () => {
    fetchMock.mockResolvedValueOnce(streamOf([sse('status', { status: 'Working' })]));
    const { result } = renderHook(() => useConversation({ initial: { id: 'c1', title: null, createdAt: '', updatedAt: '', messages: [] } }));
    await act(() => result.current.send('Q'));
    expect(result.current.records[1]).toMatchObject({ status: 'FAILED', stored: true });
    fetchMock.mockResolvedValueOnce(streamOf([sse('final', { answer: 'ok', messageId: 'm3' })]));
    await act(() => result.current.retry());
    expect(lastBody()).toEqual({ conversationId: 'c1', retry: true, messages: [] });
  });

  it('send says whether it sent, and a count callback fires only for a chat that exists', async () => {
    fetchMock.mockImplementation(async () => streamOf(happy));
    const onQuestionSent = vi.fn();
    const { result } = renderHook(() => useConversation({ onQuestionSent }));
    let sent: boolean | undefined;
    await act(async () => {
      sent = await result.current.send('   ');
    });
    expect(sent).toBe(false);
    await act(async () => {
      sent = await result.current.send('first');
    });
    expect(sent).toBe(true);
    expect(onQuestionSent).not.toHaveBeenCalled(); // the first question's count comes with the new chat
    await act(() => result.current.send('second'));
    expect(onQuestionSent).toHaveBeenCalledTimes(1);
  });

  it('a stop after the conversation event keeps its id, so the next question joins that chat', async () => {
    let live!: ReturnType<typeof openStream>;
    fetchMock.mockImplementation(async (_u: string, init: RequestInit) => {
      live = openStream(init.signal as AbortSignal);
      return live.res;
    });
    const { result } = renderHook(() => useConversation());
    act(() => void result.current.send('first'));
    await waitFor(() => expect(live).toBeDefined());
    await act(async () => live.push(sse('conversation', { id: 'c7' })));
    await waitFor(() => expect(result.current.conversationId).toBe('c7'));
    await act(async () => result.current.stop());
    await waitFor(() => expect(result.current.busy).toBe(false));

    fetchMock.mockImplementation(async () => streamOf([sse('final', { answer: 'ok', messageId: 'm2' })]));
    await act(() => result.current.send('second'));
    expect(lastBody()).toEqual({ messages: [{ role: 'user', content: 'second' }], conversationId: 'c7' });
  });

  it('cuts the stream when the screen goes, and tells nobody about a chat created after that', async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      let live!: ReturnType<typeof openStream>;
      let signal!: AbortSignal;
      fetchMock.mockImplementation(async (_u: string, init: RequestInit) => {
        signal = init.signal as AbortSignal;
        live = openStream(signal);
        return live.res;
      });
      const onConversationCreated = vi.fn();
      const { result, unmount } = renderHook(() => useConversation({ onConversationCreated }));
      act(() => void result.current.send('q'));
      await waitFor(() => expect(live).toBeDefined());
      unmount();
      await vi.advanceTimersByTimeAsync(5);
      expect(signal.aborted).toBe(true);
      expect(onConversationCreated).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });

  it('keeps streaming through a StrictMode remount', async () => {
    const { StrictMode } = await import('react');
    let signal!: AbortSignal;
    fetchMock.mockImplementation(async (_u: string, init: RequestInit) => {
      signal = init.signal as AbortSignal;
      return streamOf(happy);
    });
    const { result } = renderHook(() => useConversation(), { wrapper: StrictMode });
    await act(() => result.current.send('q'));
    await new Promise((r) => setTimeout(r, 10));
    expect(signal.aborted).toBe(false);
    expect(result.current.records[1]).toMatchObject({ status: 'COMPLETE' });
  });

  it('maps CHAT_BUSY to its copy', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ code: 'CHAT_BUSY', message: 'x' }), { status: 429 }));
    const { result } = renderHook(() => useConversation());
    await act(() => result.current.send('q'));
    expect(result.current.records[1]).toMatchObject({ status: 'FAILED', error: CHAT_BUSY_MESSAGE });
    expect(notify).toHaveBeenCalledWith({ error: CHAT_BUSY_MESSAGE });
  });

  it('maps other HTTP failures, network errors and a stream with no final to FAILED', async () => {
    fetchMock.mockResolvedValueOnce(new Response('nope', { status: 500 }));
    const { result } = renderHook(() => useConversation());
    await act(() => result.current.send('a'));
    expect(result.current.records[1]).toMatchObject({ status: 'FAILED', error: CHAT_FAILED_MESSAGE });

    fetchMock.mockRejectedValueOnce(new TypeError('network'));
    await act(() => result.current.send('b'));
    expect(result.current.records[3]).toMatchObject({ status: 'FAILED', error: CHAT_FAILED_MESSAGE });

    fetchMock.mockResolvedValueOnce(streamOf([sse('status', { status: 'x' })]));
    await act(() => result.current.send('c'));
    expect(result.current.records[5]).toMatchObject({ status: 'FAILED', error: CHAT_FAILED_MESSAGE });
    expect(result.current.busy).toBe(false);
  });

  it('starts from a stored conversation and continues it by id', async () => {
    const initial: Conversation = {
      id: 'c9',
      title: 'Old',
      createdAt: '',
      updatedAt: '',
      messages: [
        { id: 'm1', role: 'USER', createdAt: '', text: 'hi', draftResult: null },
        {
          id: 'm2',
          role: 'ASSISTANT',
          createdAt: '',
          draftResult: { action: 'saved', reportId: 'r1' },
          answer: { answer: 'hello', steps: [{ action: 'calc', summary: 's' }], status: 'STOPPED' },
        },
      ],
    };
    fetchMock.mockResolvedValue(streamOf([sse('final', { answer: 'more', messageId: 'm4' })]));
    const { result } = renderHook(() => useConversation({ initial }));
    expect(result.current.title).toBe('Old');
    expect(result.current.conversationId).toBe('c9');
    expect(result.current.records[0]).toMatchObject({ kind: 'user', text: 'hi' });
    expect(result.current.records[1]).toMatchObject({
      status: 'STOPPED',
      answer: 'hello',
      messageId: 'm2',
      draftResult: { action: 'saved', reportId: 'r1' },
    });
    await act(() => result.current.send('again'));
    expect(lastBody().conversationId).toBe('c9');
  });
});

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

import { ensureNotificationPermission } from '@/lib/browserNotifications';

import { notifyChatComplete } from './chatNotifications';
import type { ChatRecord, ChatStep, Conversation } from './conversation.types';
import { createSseParser } from './sseParser';

export const CHAT_BUSY_MESSAGE = 'Ask the data is busy with another answer. Try again in a moment.';
export const CHAT_FAILED_MESSAGE = 'The answer did not finish. Your question is kept.';

type AssistantRecord = Extract<ChatRecord, { kind: 'assistant' }>;

export interface UseConversationOptions {
  initial?: Conversation;
  /** Called once, when the server creates the conversation for the first question. */
  onConversationCreated?: (id: string) => void;
  /** Called when a question is sent in a chat that already exists (not on a re-send of a failed one). */
  onQuestionSent?: () => void;
  /** Called when the server has titled the conversation. */
  onTitle?: (title: string) => void;
}

export interface UseConversation {
  records: ChatRecord[];
  busy: boolean;
  conversationId: string | null;
  title: string | null;
  /** Resolves with whether the question was sent (false for empty text or while an answer runs). */
  send: (question: string) => Promise<boolean>;
  stop: () => void;
  retry: () => Promise<void>;
}

function recordsFrom(conversation?: Conversation): ChatRecord[] {
  if (!conversation) return [];
  return conversation.messages.map((m): ChatRecord => {
    if (m.role === 'USER') return { kind: 'user', id: m.id, text: m.text ?? '', createdAt: m.createdAt };
    const a = m.answer;
    return {
      kind: 'assistant',
      id: m.id,
      messageId: m.id,
      stored: true,
      status: a?.status ?? 'COMPLETE',
      steps: a?.steps ?? [],
      answer: a?.answer,
      clarify: a?.clarify,
      clarifyOptions: a?.clarifyOptions,
      blocks: a?.blocks,
      durationMs: a?.durationMs,
      error: a?.error,
      draftResult: m.draftResult,
    };
  });
}

let localCounter = 0;
function nextLocalId(prefix: string): string {
  localCounter += 1;
  return `local-${prefix}-${localCounter}`;
}

function newRunning(): AssistantRecord {
  return { kind: 'assistant', id: nextLocalId('a'), status: 'running', steps: [] };
}

async function httpFailureMessage(res: Response): Promise<string> {
  let code: string | undefined;
  try {
    code = (await res.json())?.code;
  } catch {
    // Not JSON; the status decides.
  }
  return code === 'CHAT_BUSY' || res.status === 429 ? CHAT_BUSY_MESSAGE : CHAT_FAILED_MESSAGE;
}

/** State and streaming for one Ask the data conversation. No UI. */
export function useConversation(options: UseConversationOptions = {}): UseConversation {
  const [records, setRecords] = useState<ChatRecord[]>(() => recordsFrom(options.initial));
  const [busy, setBusy] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(options.initial?.id ?? null);
  const [title, setTitle] = useState<string | null>(options.initial?.title ?? null);

  const optionsRef = useRef(options);
  optionsRef.current = options;
  const idRef = useRef<string | null>(options.initial?.id ?? null);
  const busyRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);
  const recordsRef = useRef(records);
  recordsRef.current = records;
  const mountedRef = useRef(true);

  // A stream outliving its screen is cut. StrictMode's simulated unmount remounts at once, so the cut waits a tick.
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      const controller = abortRef.current;
      setTimeout(() => {
        if (!mountedRef.current) controller?.abort();
      }, 0);
    };
  }, []);

  const patch = useCallback((localId: string, change: Partial<AssistantRecord>) => {
    setRecords((prev) =>
      prev.map((r) => (r.kind === 'assistant' && r.id === localId ? { ...r, ...change } : r)),
    );
  }, []);

  const run = useCallback(
    async (body: Record<string, unknown>, localId: string) => {
      const controller = new AbortController();
      abortRef.current = controller;
      busyRef.current = true;
      setBusy(true);
      ensureNotificationPermission();

      const steps: ChatStep[] = [];
      let finished = false;
      let stored = false;
      const fail = (message: string, messageId?: string) => {
        finished = true;
        patch(localId, { status: 'FAILED', error: message, steps: [...steps], messageId });
        notifyChatComplete({ error: message });
      };

      try {
        const res = await fetch('/api/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
          signal: controller.signal,
        });
        if (!res.ok) {
          fail(await httpFailureMessage(res));
          return;
        }
        if (!res.body) {
          fail(CHAT_FAILED_MESSAGE);
          return;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        const parser = createSseParser();
        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          for (const { event, data } of parser.feed(decoder.decode(value, { stream: true }))) {
            if (!stored) {
              // Any event means the server has the question.
              stored = true;
              patch(localId, { stored: true });
            }
            if (event === 'conversation') {
              idRef.current = data.id;
              setConversationId(data.id);
              if (mountedRef.current) optionsRef.current.onConversationCreated?.(data.id);
            } else if (event === 'status') {
              patch(localId, { statusText: data.status });
            } else if (event === 'trace') {
              steps.push(data);
              patch(localId, { steps: [...steps] });
            } else if (event === 'final') {
              finished = true;
              if (!idRef.current && data.conversationId) {
                idRef.current = data.conversationId;
                setConversationId(data.conversationId);
              }
              patch(localId, {
                status: 'COMPLETE',
                answer: data.answer,
                clarify: data.clarify,
                clarifyOptions: data.clarifyOptions,
                blocks: data.blocks,
                durationMs: data.durationMs,
                messageId: data.messageId,
                steps: [...steps],
              });
              notifyChatComplete({ answer: data.answer, clarify: data.clarify });
            } else if (event === 'title') {
              setTitle(data.title);
              optionsRef.current.onTitle?.(data.title);
            } else if (event === 'error') {
              fail(data.message || CHAT_FAILED_MESSAGE, data.messageId);
            }
          }
        }
        if (!finished) fail(CHAT_FAILED_MESSAGE);
      } catch (err) {
        if (controller.signal.aborted) return;
        if (!finished) fail(CHAT_FAILED_MESSAGE);
        else if (err instanceof Error) console.error(err);
      } finally {
        if (abortRef.current === controller) abortRef.current = null;
        busyRef.current = false;
        setBusy(false);
      }
    },
    [patch],
  );

  const dispatch = useCallback(
    async (question: string, counts: boolean): Promise<boolean> => {
      const text = question.trim();
      if (!text || busyRef.current) return false;
      const user: ChatRecord = { kind: 'user', id: nextLocalId('u'), text, createdAt: new Date().toISOString() };
      const assistant = newRunning();
      setRecords((prev) => [...prev, user, assistant]);
      if (counts && idRef.current) optionsRef.current.onQuestionSent?.();
      const messages = [{ role: 'user', content: text }];
      await run(
        idRef.current ? { messages, conversationId: idRef.current } : { messages, newConversation: true },
        assistant.id,
      );
      return true;
    },
    [run],
  );

  const send = useCallback((question: string) => dispatch(question, true), [dispatch]);

  const retry = useCallback(async () => {
    const id = idRef.current;
    const all = recordsRef.current;
    const last = all[all.length - 1];
    if (busyRef.current || last?.kind !== 'assistant') return;
    if (!id || !last.stored) {
      // The server never got this question (no event came back): ask it again as a new message. A retry flag would
      // make the server re-answer the previous stored question and drop its answer.
      const question = all[all.length - 2];
      if (question?.kind !== 'user') return;
      setRecords((prev) => prev.slice(0, -2));
      recordsRef.current = all.slice(0, -2);
      await dispatch(question.text, false);
      return;
    }
    const assistant = newRunning();
    setRecords((prev) => [...prev.slice(0, -1), assistant]);
    await run({ conversationId: id, retry: true, messages: [] }, assistant.id);
  }, [run, dispatch]);

  const stop = useCallback(() => {
    const controller = abortRef.current;
    if (!controller) return;
    controller.abort();
    setRecords((prev) =>
      prev.map((r) => (r.kind === 'assistant' && r.status === 'running' ? { ...r, status: 'STOPPED' } : r)),
    );
  }, []);

  return { records, busy, conversationId, title, send, stop, retry };
}

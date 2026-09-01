'use client';

import { useEffect, useRef, useState } from 'react';

import { ensureNotificationPermission } from '@/lib/browserNotifications';

import { ChatTrace, Message } from '../components/chat.types';
import { notifyChatComplete } from './chatNotifications';
import { buildTranscript } from './transcript';

export function useChatStream() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [expandedTraces, setExpandedTraces] = useState<Record<number, boolean>>({});

  const containerRef = useRef<HTMLDivElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottomIfNear = (force = false) => {
    const container = containerRef.current;
    if (!container) return;
    const isNearBottom =
      container.scrollHeight - container.scrollTop - container.clientHeight <= 120;
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
    }
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
    ensureNotificationPermission();

    try {
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
        const errorMessage = errJson.message || 'Failed to process request';
        setMessages((prev) => {
          const updated = [...prev];
          updated[assistantMsgIndex] = {
            role: 'assistant',
            error: errorMessage,
            startTime,
          };
          return updated;
        });
        notifyChatComplete({ error: errorMessage });
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
      let eventName = 'message';
      let sawTerminalEvent = false;

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed) {
            eventName = 'message';
            continue;
          }
          if (trimmed.startsWith(':')) continue;

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
                sawTerminalEvent = true;
                notifyChatComplete({
                  answer: data.answer,
                  clarify: data.clarify,
                });
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
                sawTerminalEvent = true;
                notifyChatComplete({
                  error: data.message || 'Error occurred during processing',
                });
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

      if (!sawTerminalEvent) {
        notifyChatComplete({
          error: 'The stream ended before an answer arrived. Please try again.',
        });
      }
      setMessages((prev) => {
        const updated = [...prev];
        const msg = updated[assistantMsgIndex];
        if (msg && msg.isStreaming) {
          updated[assistantMsgIndex] = {
            role: 'assistant',
            error: 'The stream ended before an answer arrived. Please try again.',
            traces: accumulatedTraces,
            isStreaming: false,
            startTime,
          };
        }
        return updated;
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Network error occurred';
      setMessages((prev) => {
        const updated = [...prev];
        updated[assistantMsgIndex] = {
          role: 'assistant',
          error: errorMessage,
          startTime,
        };
        return updated;
      });
      notifyChatComplete({ error: errorMessage });
    } finally {
      setIsStreaming(false);
    }
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

  const lastMessage = messages[messages.length - 1];
  const awaitingClarify =
    !isStreaming && lastMessage?.role === 'assistant' && Boolean(lastMessage.clarify);

  return {
    messages,
    input,
    setInput,
    isStreaming,
    expandedTraces,
    containerRef,
    messagesEndRef,
    toggleTrace,
    handleDraftStateChange,
    handleClearChat,
    handleSendPrompt,
    handleSend,
    awaitingClarify,
  };
}

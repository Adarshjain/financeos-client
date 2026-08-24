'use client';

import { ChevronDown, ChevronRight, Loader2, Send, Sparkles } from 'lucide-react';
import React, { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';

interface ChatTrace {
  step: number;
  action: string;
  summary: string;
  detail?: string;
  rowCount?: number | null;
  durationMs?: number | null;
}

interface Message {
  role: 'user' | 'assistant';
  content?: string;
  clarify?: string;
  traces?: ChatTrace[];
  isStreaming?: boolean;
  status?: string;
  error?: string;
}

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [expandedTraces, setExpandedTraces] = useState<Record<number, boolean>>({});

  const toggleTrace = (index: number) => {
    setExpandedTraces((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const prompt = input.trim();
    if (!prompt || isStreaming) return;

    setInput('');
    const userMsg: Message = { role: 'user', content: prompt };
    const assistantMsgIndex = messages.length + 1;
    const initialAssistantMsg: Message = {
      role: 'assistant',
      isStreaming: true,
      status: 'Thinking…',
      traces: [],
    };

    const newMessages = [...messages, userMsg, initialAssistantMsg];
    setMessages(newMessages);
    setIsStreaming(true);

    try {
      // Extract transcript (role and content only)
      const transcript = newMessages
        .filter((m) => m.content && !m.isStreaming)
        .map((m) => ({ role: m.role, content: m.content || '' }));

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
                    traces: accumulatedTraces,
                    isStreaming: false,
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
            error: 'The stream ended before an answer arrived. Please try again.',
            traces: accumulatedTraces,
            isStreaming: false,
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
        };
        return updated;
      });
    } finally {
      setIsStreaming(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="mx-auto flex h-[calc(100vh-4rem)] max-w-4xl flex-col p-4">
      {/* Header */}
      <div className="mb-4 flex items-center justify-between border-b pb-3">
        <div className="flex items-center gap-2">
          <div className="rounded-lg bg-primary/10 p-2 text-primary">
            <Sparkles className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Chat with Your Data</h1>
            <p className="text-2xs text-muted-foreground">
              Ask natural language questions about your accounts, spend, trades, and rewards.
            </p>
          </div>
        </div>
      </div>

      {/* Transcript Area */}
      <div className="flex-1 overflow-y-auto space-y-4 pr-2">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center rounded-xl border border-dashed p-8 text-center">
            <Sparkles className="mb-3 h-8 w-8 text-muted-foreground/60" />
            <h3 className="text-sm font-medium">No messages yet</h3>
            <p className="mt-1 max-w-sm text-2xs text-muted-foreground">
              Try asking: &quot;What was my total spend last month?&quot; or &quot;Which credit card is best for ₹5000 dining?&quot;
            </p>
          </div>
        ) : (
          messages.map((msg, index) => (
            <div
              key={index}
              className={`flex flex-col ${msg.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-xl px-4 py-3 text-xs leading-relaxed ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : msg.error
                      ? 'border border-rose-200 bg-rose-50/50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300'
                      : 'border bg-card text-card-foreground shadow-xs'
                }`}
              >
                {msg.role === 'user' ? (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                ) : (
                  <div>
                    {msg.isStreaming && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        <span className="text-2xs font-medium">{msg.status}</span>
                      </div>
                    )}

                    {msg.clarify && (
                      <div className="rounded-lg bg-amber-50 p-2.5 text-amber-800 dark:bg-amber-950/40 dark:text-amber-300">
                        <p className="font-medium">{msg.clarify}</p>
                      </div>
                    )}

                    {msg.content && (
                      <div className="prose prose-sm dark:prose-invert max-w-none text-xs">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                      </div>
                    )}

                    {msg.error && (
                      <div className="flex items-center gap-2">
                        <p className="text-2xs font-medium">{msg.error}</p>
                      </div>
                    )}

                    {/* How I got this disclosure */}
                    {msg.traces && msg.traces.length > 0 && (
                      <div className="mt-3 border-t pt-2">
                        <button
                          type="button"
                          onClick={() => toggleTrace(index)}
                          className="flex items-center gap-1 text-2xs font-medium text-muted-foreground hover:text-foreground"
                        >
                          {expandedTraces[index] ? (
                            <ChevronDown className="h-3 w-3" />
                          ) : (
                            <ChevronRight className="h-3 w-3" />
                          )}
                          <span>How I got this ({msg.traces.length} steps)</span>
                        </button>

                        {expandedTraces[index] && (
                          <div className="mt-2 space-y-2 rounded-lg bg-muted/50 p-2 text-2xs font-mono">
                            {msg.traces.map((trace, tIdx) => (
                              <div key={tIdx} className="space-y-1 border-b border-border/40 pb-1.5 last:border-0">
                                <div className="flex items-center justify-between text-muted-foreground font-sans text-3xs">
                                  <span className="font-semibold uppercase tracking-wider">{trace.action}</span>
                                  <span>{trace.durationMs ? `${trace.durationMs}ms` : ''} {trace.rowCount !== null && trace.rowCount !== undefined ? `(${trace.rowCount} rows)` : ''}</span>
                                </div>
                                <p className="font-sans text-2xs">{trace.summary}</p>
                                {trace.detail && (
                                  <pre className="max-h-24 overflow-x-auto rounded bg-background p-1 text-3xs text-foreground">
                                    {trace.detail}
                                  </pre>
                                )}
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* Composer Input */}
      <form onSubmit={handleSend} className="mt-4 flex items-end gap-2 border-t pt-3">
        <Textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask a question about your financial data…"
          disabled={isStreaming}
          rows={1}
          className="min-h-[44px] max-h-32 resize-none text-xs"
        />
        <Button type="submit" size="icon" disabled={!input.trim() || isStreaming}>
          {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
        </Button>
      </form>
    </div>
  );
}

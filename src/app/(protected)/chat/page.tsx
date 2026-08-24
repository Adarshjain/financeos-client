'use client';

import {
  Bot,
  ChevronDown,
  ChevronRight,
  Database,
  Loader2,
  Plus,
  Send,
  Sparkles,
  Wrench,
} from 'lucide-react';
import React, { useEffect, useRef, useState } from 'react';
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

const SUGGESTIONS = [
  {
    title: 'Spend Analysis',
    prompt: 'What was my total spend last month by category?',
    icon: '📊',
  },
  {
    title: 'Card Recommendation',
    prompt: 'Which credit card gives the best rewards for ₹5,000 dining?',
    icon: '💳',
  },
  {
    title: 'Net Worth Summary',
    prompt: 'Show my current net worth breakdown across all accounts.',
    icon: '💰',
  },
  {
    title: 'Portfolio Holdings',
    prompt: 'Summarize my top investment holdings and total valuation.',
    icon: '📈',
  },
];

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [expandedTraces, setExpandedTraces] = useState<Record<number, boolean>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isStreaming]);

  const toggleTrace = (index: number) => {
    setExpandedTraces((prev) => ({ ...prev, [index]: !prev[index] }));
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

  const handleSend = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const prompt = input.trim();
    if (!prompt || isStreaming) return;
    setInput('');
    executeSend(prompt);
  };

  const executeSend = async (prompt: string) => {
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
    <div className="relative flex h-[calc(100vh-4rem)] flex-col bg-background">
      {/* Sleek Header */}
      <header className="flex h-14 shrink-0 items-center justify-between px-4">

        {messages.length > 0 && (<>
          <h1 className="text-base font-semibold tracking-tight text-foreground">Chat with Your Data</h1>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleClearChat}
            disabled={isStreaming}
            className="h-8 gap-1.5 text-2xs text-muted-foreground hover:text-foreground"
          >
            <Plus className="h-3.5 w-3.5" />
            <span>New Chat</span>
          </Button>
        </>)}
      </header>

      {/* Main Transcript Container */}
      <main className="flex-1 overflow-y-auto px-4 py-2">
        <div className="mx-auto max-w-3xl space-y-6">
          {messages.length === 0 ? (
            /* Modern Empty State Hero & Suggestion Cards */
            <div className="my-auto flex flex-col items-center justify-center text-center">
              <div className="relative mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary shadow-xs">
                <Sparkles className="h-7 w-7" />
              </div>
              <h2 className="text-base font-medium tracking-tight text-foreground">
                How can I help with your finances today?
              </h2>
              <p className="mt-1.5 max-w-md text-2xs text-muted-foreground">
                Ask questions about transactions, net worth, portfolio holdings, or credit card reward optimizations.
              </p>

              <div className="mt-8 grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
                {SUGGESTIONS.map((item, i) => (
                  <button
                    key={i}
                    onClick={() => handleSendPrompt(item.prompt)}
                    className="flex flex-col items-start gap-1 rounded-xl border border-border/50 bg-card p-3.5 text-left transition-all hover:border-primary/40 hover:bg-accent/40 hover:shadow-xs group"
                  >
                    <div className="flex items-center gap-2 text-xs font-medium text-foreground group-hover:text-primary">
                      <span>{item.icon}</span>
                      <span>{item.title}</span>
                    </div>
                    <p className="text-3xs text-muted-foreground line-clamp-2">{item.prompt}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            /* Message Flow */
            messages.map((msg, index) => (
              <div key={index} className="space-y-2">
                {msg.role === 'user' ? (
                  /* User Message Bubble */
                  <div className="flex justify-end">
                    <div className="max-w-[80%] rounded-2xl rounded-tr-xs bg-primary px-3 py-1.5 text-xs text-primary-foreground shadow-xs leading-relaxed">
                      <p className="whitespace-pre-wrap">{msg.content}</p>
                    </div>
                  </div>
                ) : (
                  /* Assistant Response Row */
                  <div className="flex-1 space-y-2.5 pt-0.5 overflow-hidden">
                      {/* Streaming status indicator */}
                      {msg.isStreaming && (
                        <div className="flex items-center gap-2 text-2xs text-muted-foreground">
                          <Loader2 className="h-3.5 w-3.5 animate-spin text-primary" />
                          <span className="font-medium">{msg.status}</span>
                        </div>
                      )}

                      {/* Clarification prompt */}
                      {msg.clarify && (
                        <div className="rounded-xl bg-amber-500/10 p-3 text-2xs text-amber-700 dark:text-amber-400">
                          <p className="font-medium">{msg.clarify}</p>
                        </div>
                      )}

                      {/* Final Markdown Answer */}
                      {msg.content && (
                        <div className="prose prose-sm dark:prose-invert max-w-none text-xs text-foreground [&_table]:my-3 [&_table]:w-full [&_table]:border-collapse [&_table]:text-2xs [&_th]:border-b [&_th]:border-border/60 [&_th]:pb-1.5 [&_th]:text-left [&_th]:font-semibold [&_td]:border-b [&_td]:border-border/30 [&_td]:py-1.5">
                          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                        </div>
                      )}

                      {/* Error notice */}
                      {msg.error && (
                        <div className="rounded-xl border border-rose-200 bg-rose-50/50 p-3 text-2xs text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">
                          <p className="font-medium">{msg.error}</p>
                        </div>
                      )}

                      {/* Execution Trace Chip & Panel */}
                      {msg.traces && msg.traces.length > 0 && (
                        <div className="pt-1 text-xs">
                          <button
                            type="button"
                            onClick={() => toggleTrace(index)}
                            className="inline-flex items-center gap-1.5 rounded-full border border-border/40 bg-muted/50 px-3 py-1 text-3xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                          >
                            {expandedTraces[index] ? (
                              <ChevronDown className="h-3 w-3" />
                            ) : (
                              <ChevronRight className="h-3 w-3" />
                            )}
                            <span>Trace ({msg.traces.length} steps)</span>
                          </button>

                          {expandedTraces[index] && (
                            <div className="mt-2.5 space-y-2 rounded-xl border border-border/40 bg-muted/40 p-3 text-3xs font-mono">
                              {msg.traces.map((trace, tIdx) => (
                                <div key={tIdx} className="space-y-1 border-b border-border/30 pb-2 last:border-0 last:pb-0">
                                  <div className="flex items-center justify-between font-sans text-muted-foreground">
                                    <div className="flex items-center gap-1.5">
                                      {trace.action === 'run_sql' ? (
                                        <Database className="h-3 w-3 text-blue-500" />
                                      ) : (
                                        <Wrench className="h-3 w-3 text-amber-500" />
                                      )}
                                      <span className="font-semibold uppercase tracking-wider text-foreground">
                                        Step {trace.step}: {trace.action}
                                      </span>
                                    </div>
                                    <span>
                                      {trace.durationMs ? `${trace.durationMs}ms` : ''}
                                      {trace.rowCount !== null && trace.rowCount !== undefined ? ` • ${trace.rowCount} rows` : ''}
                                    </span>
                                  </div>
                                  <p className="font-sans text-2xs text-muted-foreground">{trace.summary}</p>
                                  {trace.detail && (
                                    <div className="relative mt-1 overflow-hidden rounded-lg bg-background p-2 font-mono text-3xs border border-border/40">
                                      {/*<div className="max-h-32 overflow-x-auto whitespace-pre text-foreground">*/}
                                        {trace.detail}
                                      {/*</div>*/}
                                    </div>
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
            ))
          )}
          <div ref={messagesEndRef} />
        </div>
      </main>

      {/* Floating Modern Input Composer */}
      <footer className="sticky bottom-4 mx-auto w-full max-w-3xl px-4 pt-2">
        <form
          onSubmit={handleSend}
          className="relative flex items-center rounded-2xl border border-border/80 bg-background/95 p-1.5 shadow-lg shadow-black/5 backdrop-blur-md transition-all focus-within:border-primary/50 focus-within:ring-2 focus-within:ring-primary/20"
        >
          <Textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask anything about your data…"
            disabled={isStreaming}
            rows={1}
            className="w-full resize-none !border-0 bg-transparent p-0 min-h-auto h-auto shadow-none pl-1 placeholder:text-muted-foreground/70 focus-visible:ring-0 focus-visible:outline-none"
          />
          <Button
            type="submit"
            size="icon"
            disabled={!input.trim() || isStreaming}
            className="h-9 w-9 shrink-0 rounded-xl transition-all"
          >
            {isStreaming ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </Button>
        </form>
      </footer>
    </div>
  );
}

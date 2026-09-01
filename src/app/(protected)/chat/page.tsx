'use client';

import { Plus } from 'lucide-react';

import { Button } from '@/components/ui/button';

import { AssistantMessage } from './components/AssistantMessage';
import { Composer } from './components/Composer';
import { EmptyState } from './components/EmptyState';
import { UserBubble } from './components/UserBubble';
import { useChatStream } from './lib/useChatStream';

export default function ChatPage() {
  const {
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
  } = useChatStream();

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
      <main ref={containerRef} className="flex-1 overflow-y-auto px-4 py-4">
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

'use client';

import { ArrowUp } from 'lucide-react';
import { useEffect, useRef } from 'react';

import { PixelGridLoader } from './PixelGridLoader';

interface ComposerProps {
  input: string;
  setInput: (val: string) => void;
  isStreaming: boolean;
  onSend: () => void;
  awaitingClarify?: boolean;
}

export function Composer({
  input,
  setInput,
  isStreaming,
  onSend,
  awaitingClarify,
}: ComposerProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Focus on page load, and re-focus whenever a clarifying question arrives.
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  useEffect(() => {
    if (awaitingClarify) {
      textareaRef.current?.focus();
    }
  }, [awaitingClarify]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      onSend();
    }
  };

  return (
    <footer className="sticky bottom-0 mx-auto w-full max-w-3xl px-3 pt-2 pb-16 lg:pb-4">
      <div
        role="presentation"
        onClick={() => textareaRef.current?.focus()}
        className="flex cursor-text flex-col gap-2 rounded-2xl border border-[var(--line)] bg-[var(--surface)] p-2.5 shadow-[var(--shadow-card)] transition-[border-color,box-shadow] duration-150 focus-within:border-[var(--line-strong)]"
      >
        <textarea
          ref={textareaRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            awaitingClarify
              ? 'Reply to the question above…'
              : 'Ask anything about your data…'
          }
          disabled={isStreaming}
          rows={1}
          className="w-full resize-none border-0 bg-transparent p-0 text-xs leading-[1.4] text-[var(--ink)] placeholder:text-[var(--ink-3)] shadow-none focus-visible:ring-0 focus-visible:outline-none max-h-36 overflow-y-auto"
          style={{ fieldSizing: 'content' } as React.CSSProperties}
        />
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={onSend}
            disabled={!input.trim() || isStreaming}
            className={`size-7 rounded-[8px] flex items-center justify-center transition-[background-color,color,transform] duration-200 enabled:active:scale-[0.96] disabled:cursor-not-allowed ${
              !input.trim() || isStreaming
                ? 'bg-[var(--line-strong)] text-[var(--ink-2)]'
                : 'bg-[var(--accent)] text-white'
            }`}
            aria-label="Send message"
          >
            {isStreaming ? (
              <PixelGridLoader className="[&>div]:bg-current" />
            ) : (
              <ArrowUp className="size-4" strokeWidth={2.4} />
            )}
          </button>
        </div>
      </div>
    </footer>
  );
}

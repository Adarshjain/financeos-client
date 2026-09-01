'use client';

import { SUGGESTIONS } from './chat.types';

interface EmptyStateProps {
  onSelectPrompt: (prompt: string) => void;
}

export function EmptyState({ onSelectPrompt }: EmptyStateProps) {
  return (
    <div className="my-auto flex flex-col items-center justify-center text-center">
      <h2 className="text-base font-medium tracking-tight text-[var(--ink)]">
        How can I help with your finances today?
      </h2>
      <p className="mt-1.5 max-w-md text-2xs text-[var(--ink-3)]">
        Ask questions about transactions, net worth, portfolio holdings, or
        credit card reward optimizations.
      </p>

      <div className="mt-8 grid w-full max-w-2xl grid-cols-1 gap-3 sm:grid-cols-2">
        {SUGGESTIONS.map((item, i) => {
          const Icon = item.icon;
          return (
            <button
              key={i}
              type="button"
              onClick={() => onSelectPrompt(item.prompt)}
              className="group flex flex-col items-start gap-1 rounded-[10px] bg-[var(--surface)] p-3.5 text-left shadow-[var(--shadow-hairline)] transition-[background-color,box-shadow,transform] duration-150 hover:bg-[var(--hover)] hover:shadow-[var(--shadow-btn)] active:scale-[0.98] cursor-pointer"
              style={{
                animationName: 'bui-fade-up',
                animationDuration: '450ms',
                animationTimingFunction: 'var(--ease-out-strong)',
                animationFillMode: 'both',
                animationDelay: `${i * 60}ms`,
              }}
            >
              <div className="flex items-center gap-2 text-xs font-medium text-[var(--ink)]">
                <Icon className="size-4 text-[var(--ink-3)] transition-colors duration-150 group-hover:text-[var(--ink)]" />
                <span>{item.title}</span>
              </div>
              <p className="text-2xs text-[var(--ink-3)] line-clamp-2">
                {item.prompt}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}

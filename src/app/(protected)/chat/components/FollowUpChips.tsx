'use client';

import React from 'react';

interface FollowUpChipsProps {
  questions: string[];
  onSelect: (question: string) => void;
  /** 'onTint' renders surface-colored chips for placement on tinted backgrounds (clarify box). */
  variant?: 'default' | 'onTint';
}

export function FollowUpChips({
  questions,
  onSelect,
  variant = 'default',
}: FollowUpChipsProps) {
  if (!questions || questions.length === 0) {
    return null;
  }

  const chipClasses =
    variant === 'onTint'
      ? 'rounded-full bg-[var(--surface)] px-3 py-1 text-2xs font-medium text-[var(--ink)] shadow-[var(--shadow-hairline)] transition-[background-color,box-shadow] duration-150 hover:shadow-[var(--shadow-btn)] active:scale-[0.97] cursor-pointer text-left'
      : 'rounded-full bg-[var(--field)] px-3 py-1 text-2xs text-[var(--ink-2)] transition-colors duration-150 hover:bg-[var(--hover)] active:scale-[0.97] cursor-pointer text-left';

  return (
    <div className="flex flex-wrap gap-1.5 pt-1">
      {questions.map((question, idx) => (
        <button
          key={idx}
          type="button"
          onClick={() => onSelect(question)}
          className={chipClasses}
        >
          {question}
        </button>
      ))}
    </div>
  );
}

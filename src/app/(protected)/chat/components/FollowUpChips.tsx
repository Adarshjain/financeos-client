'use client';

import React from 'react';

interface FollowUpChipsProps {
  questions: string[];
  onSelect: (question: string) => void;
}

export function FollowUpChips({ questions, onSelect }: FollowUpChipsProps) {
  if (!questions || questions.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-1.5 pt-1">
      {questions.map((question, idx) => (
        <button
          key={idx}
          type="button"
          onClick={() => onSelect(question)}
          className="rounded-full bg-[var(--field)] px-3 py-1 text-2xs text-[var(--ink-2)] transition-colors duration-150 hover:bg-[var(--hover)] active:scale-[0.97] cursor-pointer text-left"
        >
          {question}
        </button>
      ))}
    </div>
  );
}

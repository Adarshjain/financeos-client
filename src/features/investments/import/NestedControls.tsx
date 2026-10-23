'use client';

import React from 'react';

/**
 * Wraps the controls inside a selectable table row, so pressing one never toggles the row
 * (the row's press and long-press listen on the same pointer events).
 */
export function NestedControls({ children }: { children: React.ReactNode }) {
  const stop = (e: React.SyntheticEvent) => e.stopPropagation();
  return (
    <div className="flex flex-wrap items-center gap-x-space-8" onPointerDown={stop} onPointerUp={stop} onClick={stop} onKeyDown={stop}>
      {children}
    </div>
  );
}

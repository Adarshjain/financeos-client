'use client';

import React, { useCallback } from 'react';

export interface UseSelectableItemOptions {
  selected?: boolean;
  onSelectedChange?: (selected: boolean) => void;
  selectionMode?: boolean;
  selectable?: boolean;
  consumeLongPress?: () => boolean;
  onClick?: (e: React.MouseEvent<HTMLDivElement>) => void;
  onKeyDown?: (e: React.KeyboardEvent<HTMLDivElement>) => void;
}

export function useSelectableItem({
  selected = false,
  onSelectedChange,
  selectionMode = false,
  selectable,
  consumeLongPress,
  onClick,
  onKeyDown,
}: UseSelectableItemOptions) {
  const isSelectable = selectable ?? Boolean(onSelectedChange);

  const handleClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (consumeLongPress?.()) {
        return;
      }
      if (isSelectable || selectionMode || selected) {
        onSelectedChange?.(!selected);
      }
      onClick?.(e);
    },
    [consumeLongPress, isSelectable, selectionMode, selected, onSelectedChange, onClick],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLDivElement>) => {
      if (e.target === e.currentTarget && (e.key === 'Enter' || e.key === ' ')) {
        e.preventDefault();
        if (isSelectable || selectionMode || selected) {
          onSelectedChange?.(!selected);
        } else {
          onClick?.(e as unknown as React.MouseEvent<HTMLDivElement>);
        }
      }
      onKeyDown?.(e);
    },
    [isSelectable, selectionMode, selected, onSelectedChange, onClick, onKeyDown],
  );

  return {
    isSelectable,
    handleClick,
    handleKeyDown,
    onClick: handleClick,
    onKeyDown: handleKeyDown,
    handlers: {
      onClick: handleClick,
      onKeyDown: handleKeyDown,
    },
  };
}

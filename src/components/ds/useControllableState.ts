'use client';

import React from 'react';

export function useControllableState<T>({
  value,
  defaultValue,
  onChange,
}: {
  value?: T;
  defaultValue?: T;
  onChange?: (v: T) => void;
}) {
  const [inner, setInner] = React.useState<T>(defaultValue as T);
  const isControlled = value !== undefined;
  const current = isControlled ? (value as T) : inner;
  const set = React.useCallback(
    (next: T) => {
      if (!isControlled) setInner(next);
      onChange?.(next);
    },
    [isControlled, onChange],
  );
  return [current, set] as const;
}

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
  const initialIsControlled = React.useRef(isControlled);

  React.useEffect(() => {
    if (process.env.NODE_ENV !== 'production') {
      if (initialIsControlled.current !== isControlled) {
        console.warn(
          `Warning: A component changed from ${
            initialIsControlled.current ? 'controlled' : 'uncontrolled'
          } to ${isControlled ? 'controlled' : 'uncontrolled'}. Components should not switch between controlled and uncontrolled modes.`,
        );
      }
    }
  }, [isControlled]);

  const current = isControlled ? (value as T) : inner;

  const set = React.useCallback(
    (nextOrUpdater: T | ((prev: T) => T)) => {
      const next =
        typeof nextOrUpdater === 'function'
          ? (nextOrUpdater as (p: T) => T)(current)
          : nextOrUpdater;

      if (Object.is(next, current)) {
        return;
      }

      if (!isControlled) {
        setInner(next);
      }
      onChange?.(next);
    },
    [current, isControlled, onChange],
  );

  return [current, set] as const;
}

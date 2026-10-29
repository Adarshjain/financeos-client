import { useCallback } from 'react';

type PossibleRef<T> = React.Ref<T> | undefined;

function setRef<T>(ref: PossibleRef<T>, node: T | null) {
  if (typeof ref === 'function') ref(node);
  else if (ref) (ref as React.MutableRefObject<T | null>).current = node;
}

/** One callback ref that fills every given ref; stable while the refs are. */
export function useMergedRef<T>(...refs: PossibleRef<T>[]) {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  return useCallback((node: T | null) => refs.forEach((r) => setRef(r, node)), refs);
}

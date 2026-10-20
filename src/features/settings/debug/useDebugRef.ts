'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useCallback, useState } from 'react';

/**
 * The reference being looked up and its type, kept in `?ref=&type=` (page state, not a dialog).
 * `select` is a tap on a local failure: admins look it up, everyone else just highlights it.
 */
export function useDebugRef(initialRef: string, initialType: string, admin: boolean) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [currentRef, setCurrentRef] = useState(initialRef);
  const [currentType, setCurrentType] = useState(initialType);

  const search = useCallback(
    (newRef: string, newType: string = 'auto') => {
      setCurrentRef(newRef);
      setCurrentType(newType);

      const params = new URLSearchParams(searchParams?.toString() ?? '');
      if (newRef) {
        params.set('ref', newRef);
      } else {
        params.delete('ref');
      }

      if (newType && newType !== 'auto') {
        params.set('type', newType);
      } else {
        params.delete('type');
      }

      const queryString = params.toString();
      router.replace(queryString ? `${pathname}?${queryString}` : pathname);
    },
    [pathname, router, searchParams],
  );

  const select = useCallback(
    (selectedRef: string) => {
      if (admin) {
        search(selectedRef, 'auto');
      } else {
        setCurrentRef(selectedRef);
      }
    },
    [admin, search],
  );

  return { currentRef, currentType, search, select };
}

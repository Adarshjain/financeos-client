'use client';

import { usePathname } from 'next/navigation';
import React from 'react';

import { SharedName } from '@/lib/viewTransition';
import { transitionName } from '@/lib/viewTransitionNames';

/**
 * The title a detail page's loading skeleton shows. It carries the row's shared name (the id is the
 * address's last part), so the pressed row grows into it and it then turns into the real title.
 */
export function DetailLoadingTitle({ kind, children }: { kind: 'loan' | 'person'; children: React.ReactNode }) {
  const id = (usePathname() ?? '').split('/').filter(Boolean).pop() ?? '';
  return (
    <SharedName name={transitionName[kind](id)}>
      <span>{children}</span>
    </SharedName>
  );
}

'use client';

import Link from 'next/link';
import React from 'react';

import { Root } from '@/components/ds';

/** Dinero's Root wired to next/link; a client wrapper because a component cannot cross the server boundary as a prop. */
export function AppRoot({ children }: { children: React.ReactNode }) {
  return <Root linkComponent={Link}>{children}</Root>;
}

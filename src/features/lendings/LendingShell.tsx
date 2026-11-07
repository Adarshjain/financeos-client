'use client';

import React from 'react';

import { useAddLending } from '@/features/lendings/form/AddLendingProvider';
import { areaCrumb } from '@/features/shell/navigation';
import { ShellPage } from '@/features/shell/ShellPage';

/** The frame of `/lending`, applied by the route layout: the top bar, whose + adds a lending in place, then the page. */
export function LendingShell({ children }: { children: React.ReactNode }) {
  const addLending = useAddLending();
  return (
    <ShellPage
      crumb={areaCrumb('lendings')}
      title="Lending"
      addLabel="Add lending"
      onAdd={() => void addLending.open()}
      addLoading={addLending.loading}
    >
      {children}
    </ShellPage>
  );
}

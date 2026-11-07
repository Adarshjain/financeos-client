'use client';

import React from 'react';

import { subCrumb } from '@/features/shell/navigation';
import { ShellPage } from '@/features/shell/ShellPage';
import { useLazyDialog } from '@/lib/lazy/useLazyDialog';

import { HOLDINGS_HREF } from '../investmentsTabs';
import { loadInstrumentAddDialog } from '../lazyDialogs';

/** The frame of `/investments/instruments`: a sub-page of Investments (back arrow to Holdings), outside the tab strip, whose + adds an instrument. */
export function InstrumentsShell({ children }: { children: React.ReactNode }) {
  const [adding, setAdding] = React.useState(false);
  const add = useLazyDialog(loadInstrumentAddDialog);
  return (
    <>
      <ShellPage
        crumb={subCrumb('investments', 'Instruments')}
        title="Instruments"
        backHref={HOLDINGS_HREF}
        onAdd={() => void add.run(() => setAdding(true))}
        addLoading={add.loading}
        addLabel="Add instrument"
      >
        {children}
      </ShellPage>
      {adding && add.Component ? <add.Component onClose={() => setAdding(false)} /> : null}
    </>
  );
}

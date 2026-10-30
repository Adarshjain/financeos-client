'use client';

import React from 'react';

import { Button } from '@/components/ds/Button/Button';

import { useAccountDialogs } from './AccountDialogs';

type ButtonProps = React.ComponentProps<typeof Button>;

/** A button that opens Edit account from page state (inside AccountDialogs), with no URL change. */
export function OpenDialogButton(props: Omit<ButtonProps, 'onClick' | 'asChild'>) {
  const { openEdit, preload, loading } = useAccountDialogs();
  return <Button {...props} loading={loading} onPointerDown={preload} onClick={openEdit} />;
}

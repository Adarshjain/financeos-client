'use client';

import React from 'react';

import { Button } from '@/components/ds';
import { openDialogParam } from '@/lib/dialogParam';

type ButtonProps = React.ComponentProps<typeof Button>;

/** A button that opens an account dialog by setting its URL param, with no server round trip. */
export function OpenDialogButton({
  param,
  value,
  ...props
}: Omit<ButtonProps, 'onClick' | 'asChild'> & { param: string; value: string }) {
  return <Button {...props} onClick={() => openDialogParam(param, value)} />;
}

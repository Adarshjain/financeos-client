'use client';

import React from 'react';

import { Card } from '@/components/ds/Card/Card';
import { SettingsToggle } from '@/components/organisms/SettingsToggle/SettingsToggle';
import { AppLockRows } from '@/features/app-lock/AppLockRows';
import { useHideAmounts } from '@/features/shell/hideAmounts';
import type { AppLockStatus } from '@/lib/api/types';

/** The per-device app lock rows and Hide amounts. */
export function SecurityCard({ appLock }: { appLock: AppLockStatus }) {
  const { hidden, setHidden } = useHideAmounts();
  return (
    <Card title="Security">
      <AppLockRows status={appLock} />
      <SettingsToggle
        flush={false}
        borderTop
        label="Hide amounts"
        description="Show ₹ — instead of balances and amounts."
        checked={hidden}
        onCheckedChange={setHidden}
      />
    </Card>
  );
}

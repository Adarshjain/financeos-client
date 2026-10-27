import React from 'react';

import { SettingsShell } from '@/features/settings/SettingsShell';

export default function DsSettingsLayout({ children }: { children: React.ReactNode }) {
  return <SettingsShell>{children}</SettingsShell>;
}

'use client';

import Link from 'next/link';
import React from 'react';

import { Card } from '@/components/ds/Card/Card';
import { Icon } from '@/components/ds/Icon/Icon';
import { ListRow } from '@/components/ds/ListRow/ListRow';
import { SegmentedControl } from '@/components/ds/SegmentedControl/SegmentedControl';
import { Select } from '@/components/ds/Select/Select';
import { Text } from '@/components/ds/Text/Text';
import { DEFAULT_TAB_SLOT, parseTabSlot, type TabSlot } from '@/features/shell/tabSlotName';
import { saveTabSlot } from '@/features/shell/tabSlotSave';
import { originOf, type RevealOrigin, revealTheme } from '@/lib/themeReveal';

import { type ThemeChoice, useThemeChoice } from './profile/useThemeChoice';
import { settingsSection } from './settingsSections';
import { useRouterRefreshState } from './useRouterRefresh';

const THEME_OPTIONS = [
  { value: 'light', label: 'Light', icon: <Icon name="sun" size="xs" /> },
  { value: 'dark', label: 'Dark', icon: <Icon name="moon" size="xs" /> },
  { value: 'system', label: 'System', icon: <Icon name="monitor" size="xs" /> },
] as const;

const TAB_SLOT_OPTIONS = [
  { value: 'accounts', label: 'Accounts' },
  { value: 'lending', label: 'Lending' },
  { value: 'investments', label: 'Investments' },
  { value: 'upcoming', label: 'Upcoming' },
];

/** Theme (saved by next-themes on this device), the phone bottom bar's second tab (a cookie, read by the server) and the Notifications link. */
export function GeneralCard({ tabSlot = DEFAULT_TAB_SLOT }: { tabSlot?: TabSlot }) {
  const { theme, setTheme } = useThemeChoice();
  const { refresh, pending: refreshing } = useRouterRefreshState();
  const [slot, setSlot] = React.useState<TabSlot>(tabSlot);
  // The theme change grows from the segment that was clicked (or the control's centre for keyboard use).
  const origin = React.useRef<RevealOrigin | undefined>(undefined);
  const control = React.useRef<HTMLDivElement>(null);

  return (
    <Card title="General">
      <ListRow
        title={<Text variant="body">Theme</Text>}
        trailing={
          <div
            ref={control}
            onPointerDownCapture={(e) => {
              origin.current = originOf((e.target as Element).closest('[role="radio"]'));
            }}
          >
            <SegmentedControl<ThemeChoice>
              aria-label="Theme"
              options={[...THEME_OPTIONS]}
              value={theme}
              onValueChange={(next) => {
                revealTheme(() => setTheme(next), origin.current ?? originOf(control.current));
                origin.current = undefined;
              }}
            />
          </div>
        }
      />
      <ListRow
        borderTop
        title={<Text variant="body">Phone bottom bar</Text>}
        subtitle="Second tab"
        trailing={
          <Select
            aria-label="Phone bottom bar"
            options={TAB_SLOT_OPTIONS}
            value={slot}
            disabled={refreshing}
            onValueChange={(next) => {
              const chosen = parseTabSlot(Array.isArray(next) ? next[0] : next);
              setSlot(chosen);
              saveTabSlot(chosen);
              refresh();
            }}
          />
        }
      />
      <ListRow asChild borderTop chevron title="Notifications">
        <Link href={settingsSection('notifications').href} prefetch={false} />
      </ListRow>
    </Card>
  );
}

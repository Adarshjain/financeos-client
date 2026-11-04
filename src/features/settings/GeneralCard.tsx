'use client';

import Link from 'next/link';
import React from 'react';

import { Card } from '@/components/ds/Card/Card';
import { Icon } from '@/components/ds/Icon/Icon';
import { ListRow } from '@/components/ds/ListRow/ListRow';
import { SegmentedControl } from '@/components/ds/SegmentedControl/SegmentedControl';
import { Text } from '@/components/ds/Text/Text';
import { originOf, type RevealOrigin, revealTheme } from '@/lib/themeReveal';

import { type ThemeChoice, useThemeChoice } from './profile/useThemeChoice';
import { settingsSection } from './settingsSections';

const THEME_OPTIONS = [
  { value: 'light', label: 'Light', icon: <Icon name="sun" size="xs" /> },
  { value: 'dark', label: 'Dark', icon: <Icon name="moon" size="xs" /> },
  { value: 'system', label: 'System', icon: <Icon name="monitor" size="xs" /> },
] as const;

/** Theme (saved by next-themes on this device) and the Notifications link. */
export function GeneralCard() {
  const { theme, setTheme } = useThemeChoice();
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
      <ListRow asChild borderTop chevron title="Notifications">
        <Link href={settingsSection('notifications').href} prefetch={false} />
      </ListRow>
    </Card>
  );
}

'use client';

import React from 'react';

import { Button, Card, Icon, ListRow, SegmentedControl, Text } from '@/components/ds';
import { originOf, type RevealOrigin,revealTheme } from '@/lib/themeReveal';

import { type ThemeChoice, useThemeChoice } from './useThemeChoice';

const THEME_OPTIONS = [
  { value: 'light', label: 'Light', icon: <Icon name="sun" size="xs" /> },
  { value: 'dark', label: 'Dark', icon: <Icon name="moon" size="xs" /> },
  { value: 'system', label: 'System', icon: <Icon name="monitor" size="xs" /> },
] as const;

/** Theme (saved by next-themes on this device) and the Storybook link. */
export function AppearanceCard() {
  const { theme, setTheme } = useThemeChoice();
  // The theme change grows from the segment that was clicked (or the control's centre for keyboard use).
  const origin = React.useRef<RevealOrigin | undefined>(undefined);
  const control = React.useRef<HTMLDivElement>(null);

  return (
    <Card title="Appearance" subtitle="Saved on this device">
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
        title="Storybook"
        subtitle="Every Dinero component, live"
        trailing={
          // A static page under public/, not a Next route: a plain anchor makes it a full page load.
          <Button variant="link" asChild>
            <a href="/storybook">Open</a>
          </Button>
        }
      />
    </Card>
  );
}

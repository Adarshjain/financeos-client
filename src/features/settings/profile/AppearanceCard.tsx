'use client';

import Link from 'next/link';
import React from 'react';

import { Button, Card, Icon, ListRow, SegmentedControl, Text } from '@/components/ds';
import { SettingsToggle } from '@/components/organisms';
import { useHideAmounts } from '@/features/shell/hideAmounts';
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
  const { hidden, setHidden } = useHideAmounts();
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
      <SettingsToggle
        flush={false}
        borderTop
        label="Hide amounts"
        description="Show ₹ — instead of balances and amounts."
        checked={hidden}
        onCheckedChange={setHidden}
      />
      {/* The switch to Legacy: removed together with Legacy. Another root layout, so Next loads it as a full page. */}
      <ListRow asChild chevron title="Open Legacy">
        <Link href="/legacy/dashboard" prefetch={false} />
      </ListRow>
      <ListRow
        title="Storybook"
        subtitle="Every Dinero component, live"
        trailing={
          // A static page under public/, not a Next route: a plain anchor makes it a full page load.
          <Button variant="link" size="sm" onClick={() => window.location.assign('/storybook')}>
            Open
          </Button>
        }
      />
    </Card>
  );
}

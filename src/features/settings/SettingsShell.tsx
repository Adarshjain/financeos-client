'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React, { Suspense, use } from 'react';

import { Avatar } from '@/components/ds/Avatar/Avatar';
import { Badge } from '@/components/ds/Badge/Badge';
import { Card } from '@/components/ds/Card/Card';
import { ListRow } from '@/components/ds/ListRow/ListRow';
import { Text } from '@/components/ds/Text/Text';
import { areaCrumb } from '@/features/shell/navigation';
import { ShellPage } from '@/features/shell/ShellPage';

import { profileInitials } from './profile/profileModel';
import { useThemeChoice } from './profile/useThemeChoice';
import {
  activeSettingsSection,
  isSettingsIndex,
  SETTINGS_HREF,
  settingsGroups,
  type SettingsSection,
} from './settingsSections';

export interface SettingsShellUser {
  displayName?: string | null;
  email: string;
}

/**
 * The values shown on the list rows, each a promise so the list renders at once and a value streams in
 * when its request settles. A promise resolves to undefined when its request failed: the row shows none.
 */
export interface SettingsRowValues {
  /** Whether the app lock is on. */
  appLockArmed: Promise<boolean | undefined>;
  /** How many Gmail items need attention. */
  attentionCount: Promise<number | undefined>;
  /** How many AI keys are saved. */
  aiKeyCount: Promise<number | undefined>;
}

const THEME_LABEL = { system: 'System', light: 'Light', dark: 'Dark' } as const;

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

function AppLockValue({ promise }: { promise: Promise<boolean | undefined> }) {
  const armed = use(promise);
  return armed === undefined ? null : (
    <Text variant="label" tone="ink-3">{armed ? 'On' : 'Off'}</Text>
  );
}

function AttentionValue({ promise }: { promise: Promise<number | undefined> }) {
  const count = use(promise);
  return count ? <Badge tone="warning" size="sm">{count} needs attention</Badge> : null;
}

function AiValue({ promise }: { promise: Promise<number | undefined> }) {
  const count = use(promise);
  return count === undefined ? null : (
    <Text variant="label" tone="ink-3">{count === 0 ? 'None' : plural(count, 'key', 'keys')}</Text>
  );
}

function ThemeValue() {
  const { theme } = useThemeChoice();
  return theme ? <Text variant="label" tone="ink-3">{THEME_LABEL[theme]}</Text> : null;
}

/** The value at the end of a row, each in its own Suspense so the row never waits for it. */
function rowValue(section: SettingsSection, values: SettingsRowValues): React.ReactNode {
  switch (section.id) {
    case 'appearance':
      return <ThemeValue />;
    case 'app-lock':
      return <Suspense fallback={null}><AppLockValue promise={values.appLockArmed} /></Suspense>;
    case 'connections':
      return <Suspense fallback={null}><AttentionValue promise={values.attentionCount} /></Suspense>;
    case 'ai':
      return <Suspense fallback={null}><AiValue promise={values.aiKeyCount} /></Suspense>;
    default:
      return undefined;
  }
}

function SectionRow({
  section,
  current,
  user,
  values,
}: {
  section: SettingsSection;
  current: boolean;
  user: SettingsShellUser;
  values: SettingsRowValues;
}) {
  const value = rowValue(section, values);
  const isProfile = section.id === 'profile';
  const name = user.displayName?.trim() || user.email;
  return (
    <ListRow
      asChild
      borderTop
      chevron
      highlighted={current}
      leading={
        isProfile ? (
          <Avatar variant="circle" tone="brand" size="sm" initials={profileInitials(name)}>
            {profileInitials(name)}
          </Avatar>
        ) : undefined
      }
      title={isProfile ? name : section.label}
      subtitle={isProfile && name !== user.email ? user.email : undefined}
      trailing={value}
    >
      <Link href={section.href} prefetch={false} />
    </ListRow>
  );
}

/** The grouped list of sections. `highlight` marks the open section's row. */
function SettingsList({
  className,
  highlight,
  activeId,
  user,
  values,
}: {
  className: string;
  highlight: boolean;
  activeId: string;
  user: SettingsShellUser;
  values: SettingsRowValues;
}) {
  return (
    <nav aria-label="Settings sections" className={`flex flex-col gap-space-8 desk:gap-space-16 ${className}`}>
      {settingsGroups.map((group, i) => (
        <Card key={group.label ?? i} title={group.label}>
          {group.sections.map((section) => (
            <SectionRow
              key={section.id}
              section={section}
              current={highlight && section.id === activeId}
              user={user}
              values={values}
            />
          ))}
        </Card>
      ))}
    </nav>
  );
}

/**
 * The Settings frame, applied once by the settings route layout: a grouped list of sections and the
 * open section beside it. From `wide` both show (a fixed column and the content) from `wide` (1200px); below `wide` `/settings`
 * shows only the list (nothing highlighted), and a section shows only its content under a top bar with a back arrow.
 */
export function SettingsShell({
  user,
  values,
  children,
}: {
  user: SettingsShellUser;
  values: SettingsRowValues;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const index = isSettingsIndex(pathname);
  const active = activeSettingsSection(pathname);

  return (
    <ShellPage
      title={index ? 'Settings' : active.label}
      // Below `wide` a section is a drill-in: the crumb links back to the list (the arrow is phone-only).
      crumb={index ? areaCrumb('settings') : <Link href={SETTINGS_HREF} prefetch={false}>{areaCrumb('settings')}</Link>}
      phoneBackHref={index ? undefined : SETTINGS_HREF}
    >
      <div className="flex items-start gap-space-24">
        {index && (
          <SettingsList className="w-full max-w-container-lg wide:hidden" highlight={false} activeId={active.id} user={user} values={values} />
        )}
        <SettingsList
          className="hidden wide:flex wide:w-container-xs wide:shrink-0"
          highlight
          activeId={active.id}
          user={user}
          values={values}
        />
        <div className={`min-w-0 flex-1 max-w-container-lg ${index ? 'hidden wide:block' : ''}`}>{children}</div>
      </div>
    </ShellPage>
  );
}

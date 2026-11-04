'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import React from 'react';

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

/** The values shown on the list rows. Each is absent when its request failed, and the row then shows none. */
export interface SettingsRowValues {
  /** Whether the app lock is on. */
  appLockArmed?: boolean;
  /** How many Gmail items need attention. */
  attentionCount?: number;
  /** How many AI keys are saved. */
  aiKeyCount?: number;
}

const THEME_LABEL = { system: 'System', light: 'Light', dark: 'Dark' } as const;

function plural(count: number, one: string, many: string): string {
  return `${count} ${count === 1 ? one : many}`;
}

/** The value at the end of a row, or nothing. */
function useRowValue(section: SettingsSection, values: SettingsRowValues): React.ReactNode {
  const { theme } = useThemeChoice();
  switch (section.id) {
    case 'appearance':
      return theme ? <Text variant="label" tone="ink-3">{THEME_LABEL[theme]}</Text> : undefined;
    case 'app-lock':
      return values.appLockArmed === undefined ? undefined : (
        <Text variant="label" tone="ink-3">{values.appLockArmed ? 'On' : 'Off'}</Text>
      );
    case 'connections':
      return values.attentionCount ? (
        <Badge tone="warning" size="sm">{values.attentionCount} needs attention</Badge>
      ) : undefined;
    case 'ai':
      return values.aiKeyCount === undefined ? undefined : (
        <Text variant="label" tone="ink-3">
          {values.aiKeyCount === 0 ? 'None' : plural(values.aiKeyCount, 'key', 'keys')}
        </Text>
      );
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
  const value = useRowValue(section, values);
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

/**
 * The Settings frame, applied once by the settings route layout: a grouped list of sections and the
 * open section beside it. From `desk` both show (a fixed column and the content); on phone `/settings`
 * shows only the list, and a section shows only its content under a top bar with a back arrow.
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
      crumb={areaCrumb('settings')}
      phoneBackHref={index ? undefined : SETTINGS_HREF}
    >
      <div className="flex items-start gap-space-24">
        <nav
          aria-label="Settings sections"
          className={`flex flex-col gap-space-8 desk:gap-space-16 w-full desk:w-container-xs desk:shrink-0 ${
            index ? '' : 'hidden desk:flex'
          }`}
        >
          {settingsGroups.map((group, i) => (
            <Card key={group.label ?? i} title={group.label}>
              {group.sections.map((section) => (
                <SectionRow
                  key={section.id}
                  section={section}
                  current={section.id === active.id}
                  user={user}
                  values={values}
                />
              ))}
            </Card>
          ))}
        </nav>
        <div className={`min-w-0 flex-1 ${index ? 'hidden desk:block' : ''}`}>{children}</div>
      </div>
    </ShellPage>
  );
}

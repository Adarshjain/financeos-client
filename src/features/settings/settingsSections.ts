/** The Settings sections, in list order, grouped. `href` is the section's route. */
import { appHref } from '@/features/shell/routes';

export type SettingsSectionId =
  | 'profile'
  | 'appearance'
  | 'app-lock'
  | 'notifications'
  | 'connections'
  | 'ai'
  | 'activity'
  | 'debug';

export interface SettingsSection {
  id: SettingsSectionId;
  /** The row label, and the top-bar title on that section. */
  label: string;
  href: string;
}

export interface SettingsGroup {
  /** Undefined for the first group, which has no heading. */
  label?: string;
  sections: SettingsSection[];
}

export const SETTINGS_HREF = appHref('/settings');

const section = (id: SettingsSectionId, label: string): SettingsSection => ({
  id,
  label,
  href: `${SETTINGS_HREF}/${id}`,
});

export const settingsGroups: SettingsGroup[] = [
  { sections: [section('profile', 'Profile')] },
  {
    label: 'General',
    sections: [section('appearance', 'Appearance'), section('app-lock', 'App lock'), section('notifications', 'Notifications')],
  },
  { label: 'Data', sections: [section('connections', 'Connections'), section('ai', 'AI')] },
  { label: 'Help', sections: [section('activity', 'Activity'), section('debug', 'Debug')] },
];

export const settingsSections: SettingsSection[] = settingsGroups.flatMap((g) => g.sections);

function clean(pathname: string | null | undefined): string {
  return (pathname ?? '').replace(/\/+$/, '');
}

/** True on `/settings` itself: the list alone on phone, the Profile content beside it on desktop. */
export function isSettingsIndex(pathname: string | null | undefined): boolean {
  return clean(pathname) === SETTINGS_HREF;
}

/** The section a pathname belongs to; `/settings` and unknown paths count as Profile. */
export function activeSettingsSection(pathname: string | null | undefined): SettingsSection {
  const path = clean(pathname);
  return settingsSections.find((s) => path === s.href || path.startsWith(`${s.href}/`)) ?? settingsSections[0];
}

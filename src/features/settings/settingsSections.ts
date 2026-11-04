/** The Settings drill-in sections. `/settings` itself is the main page; each section is its own page. */
import { appHref } from '@/features/shell/routes';

export type SettingsSectionId = 'notifications' | 'connections' | 'ai' | 'activity' | 'debug';

export interface SettingsSection {
  id: SettingsSectionId;
  /** The row label on the main page, and the top-bar title on that section. */
  label: string;
  href: string;
}

export const SETTINGS_HREF = appHref('/settings');

const section = (id: SettingsSectionId, label: string): SettingsSection => ({
  id,
  label,
  href: `${SETTINGS_HREF}/${id}`,
});

export const settingsSections: SettingsSection[] = [
  section('notifications', 'Notifications'),
  section('connections', 'Connections'),
  section('ai', 'AI'),
  section('activity', 'Activity'),
  section('debug', 'Debug'),
];

/** The section by id, for the main page's rows. */
export function settingsSection(id: SettingsSectionId): SettingsSection {
  return settingsSections.find((s) => s.id === id)!;
}

function clean(pathname: string | null | undefined): string {
  return (pathname ?? '').replace(/\/+$/, '');
}

/** True on `/settings` itself. */
export function isSettingsIndex(pathname: string | null | undefined): boolean {
  return clean(pathname) === SETTINGS_HREF;
}

/** The section a pathname belongs to; undefined on `/settings` and unknown paths. */
export function activeSettingsSection(pathname: string | null | undefined): SettingsSection | undefined {
  const path = clean(pathname);
  return settingsSections.find((s) => path === s.href || path.startsWith(`${s.href}/`));
}

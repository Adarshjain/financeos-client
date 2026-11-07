/** The Settings drill-in sections. `/settings` itself is the main page; each section is its own page. */
import { activeAreaSection, type AreaSection, isAreaIndex } from '@/features/shell/areaSections';
import { appHref } from '@/features/shell/routes';

export type SettingsSectionId = 'notifications' | 'ai' | 'debug';

export type SettingsSection = AreaSection<SettingsSectionId>;

export const SETTINGS_HREF = appHref('/settings');

const section = (id: SettingsSectionId, label: string): SettingsSection => ({
  id,
  label,
  href: `${SETTINGS_HREF}/${id}`,
});

export const settingsSections: SettingsSection[] = [
  section('notifications', 'Notifications'),
  section('ai', 'AI'),
  section('debug', 'Debug'),
];

/** The section by id, for the main page's rows. */
export function settingsSection(id: SettingsSectionId): SettingsSection {
  return settingsSections.find((s) => s.id === id)!;
}

/** True on `/settings` itself. */
export function isSettingsIndex(pathname: string | null | undefined): boolean {
  return isAreaIndex(SETTINGS_HREF, pathname);
}

/** The section a pathname belongs to; undefined on `/settings` and unknown paths. */
export function activeSettingsSection(pathname: string | null | undefined): SettingsSection | undefined {
  return activeAreaSection(settingsSections, pathname);
}

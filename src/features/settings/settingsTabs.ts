/** The six Settings tabs, in board order. `href` is the Dinero preview route. */
import { appHref } from '@/features/shell/routes';
export interface SettingsTab {
  id: 'profile' | 'connections' | 'ai' | 'notifications' | 'activity' | 'debug';
  label: string;
  /** Top-bar title on this tab. */
  title: string;
  href: string;
}

export const SETTINGS_HREF = appHref('/settings');

export const settingsTabs: SettingsTab[] = [
  { id: 'profile', label: 'Profile & appearance', title: 'Settings', href: SETTINGS_HREF },
  { id: 'connections', label: 'Connections', title: 'Connections', href: `${SETTINGS_HREF}/connections` },
  { id: 'ai', label: 'AI', title: 'AI', href: `${SETTINGS_HREF}/ai` },
  { id: 'notifications', label: 'Notifications', title: 'Notifications', href: `${SETTINGS_HREF}/notifications` },
  { id: 'activity', label: 'Activity', title: 'Activity', href: `${SETTINGS_HREF}/activity` },
  { id: 'debug', label: 'Debug', title: 'Debug', href: `${SETTINGS_HREF}/debug` },
];

/** The tab a pathname belongs to; unknown paths under /settings count as Profile. */
export function activeSettingsTab(pathname: string | null | undefined): SettingsTab {
  const path = (pathname ?? '').replace(/\/+$/, '');
  return (
    settingsTabs.find((t) => t.id !== 'profile' && (path === t.href || path.startsWith(`${t.href}/`))) ??
    settingsTabs[0]
  );
}

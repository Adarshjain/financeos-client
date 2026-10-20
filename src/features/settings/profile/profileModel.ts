import type { UserResponse } from '@/lib/types';

/** Two letters for the avatar: first letters of the first two words, else the first two characters. */
export function profileInitials(text: string): string {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 2) return (words[0][0] + words[1][0]).toUpperCase();
  return text.trim().slice(0, 2).toUpperCase();
}

/** The name line (display name, else the email) and the line under it; the email never shows twice. */
export function profileLines(user: Pick<UserResponse, 'displayName' | 'email' | 'hasPassword'>) {
  const displayName = user.displayName?.trim();
  const google = user.hasPassword ? undefined : 'signed in with Google';
  if (!displayName) {
    return { name: user.email, detail: google ? 'Signed in with Google' : undefined };
  }
  return { name: displayName, detail: google ? `${user.email} · ${google}` : user.email };
}

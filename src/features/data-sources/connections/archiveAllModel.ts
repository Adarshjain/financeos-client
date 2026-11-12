import { formatDate } from '@/lib/format';

import type { AttentionItem } from './attentionItemModel';

/** "Archive 1 email?" / "Archive 12 emails?"; plain "Archive emails?" while the count is not known. */
export function archiveAllTitle(count: number | null | undefined): string {
  if (count == null || count < 0) return 'Archive emails?';
  return `Archive ${count} ${count === 1 ? 'email' : 'emails'}?`;
}

export interface ArchiveEmailLine {
  subject: string;
  sender: string;
  date: string;
}

/** One mail of the archive list: its full subject, sender and date (the email's own date, else when we found it). */
export function archiveEmailLine(item: Pick<AttentionItem, 'subject' | 'senderAddress' | 'internalDate' | 'discoveredAt'>): ArchiveEmailLine {
  return {
    subject: item.subject?.trim() || '(no subject)',
    sender: item.senderAddress?.trim() || 'Unknown sender',
    date: formatDate(item.internalDate || item.discoveredAt, 'list') || '—',
  };
}

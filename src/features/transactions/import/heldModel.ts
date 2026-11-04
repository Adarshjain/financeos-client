import { bankById } from '@/features/banks/banks';
import type { HeldUpload } from '@/lib/api/types';
import { todayInAppZone } from '@/lib/date-range';
import { formatDate } from '@/lib/format';

/** "HDFC Bank · ••1234 · added 5 Nov": what is known about a held file. */
export function heldCaption(h: Pick<HeldUpload, 'detectedBankId' | 'detectedLast4' | 'createdAt'>): string {
  const bank = bankById(h.detectedBankId)?.name;
  return [
    bank ?? null,
    h.detectedLast4 ? `••${h.detectedLast4}` : null,
    `added ${formatDate(todayInAppZone(new Date(h.createdAt)), 'list')}`,
  ]
    .filter(Boolean)
    .join(' · ');
}

const PASSWORD_CODES = ['PASSWORD_REQUIRED', 'WRONG_PASSWORD'];

/** Whether the server refused a file only because its password is missing or wrong. */
export const isPasswordCode = (code: string | null | undefined): boolean => Boolean(code && PASSWORD_CODES.includes(code));

/** The held file `?held=` points at, when it is still in the list. */
export const heldFileFor = (held: readonly HeldUpload[], id: string | undefined): HeldUpload | undefined =>
  id ? held.find((h) => h.id === id) : undefined;

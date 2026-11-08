import { buildPastCard, type Built, seenHint } from '@/features/accounts/detail/cards/cardsFormsModel';
import { holderName } from '@/features/accounts/detail/cards/cardsModel';
import type { Card, Cardholder } from '@/lib/account.types';
import type { PastCardRequest } from '@/lib/api/types';
import { todayInAppZone } from '@/lib/date-range';

export { seenHint };

/** A number last seen longer ago than this is probably an earlier card, not another number of the account. */
export const OLD_NUMBER_DAYS = 60;

export interface OldCardDraft {
  /** '' = the primary holder. */
  cardholderId: string;
  issuedOn: string;
  closedOn: string;
}

function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
}

/** The calendar day (app zone) of an instant from the server; null when there is none. */
export function dayOf(instant: string | null | undefined): string | null {
  return instant ? todayInAppZone(new Date(instant)) : null;
}

/**
 * "An old card" is the likely answer when the account already has an active card with other digits and the number was last
 * seen before that card was issued, or longer ago than OLD_NUMBER_DAYS.
 */
export function suggestOldCard(input: { cards: readonly Card[]; last4: string; lastSeenOn: string | null; today: string }): boolean {
  const { cards, last4, lastSeenOn, today } = input;
  // Every active card with other digits counts; the latest issued one is the one the number is compared with.
  const active = cards
    .filter((c) => !c.closedOn && c.last4 !== last4)
    .sort((a, b) => (b.issuedOn ?? '').localeCompare(a.issuedOn ?? ''))[0];
  if (!active || !lastSeenOn) return false;
  if (active.issuedOn && lastSeenOn < active.issuedOn) return true;
  return daysBetween(lastSeenOn, today) > OLD_NUMBER_DAYS;
}

/** Both dates, opened on or before closed, neither in the future; the body names the holder only when one was picked. */
export function buildOldCard(draft: OldCardDraft, last4: string, today: string): Built<PastCardRequest> {
  const built = buildPastCard({ last4, issuedOn: draft.issuedOn, closedOn: draft.closedOn }, today);
  if (!built.ok) return built;
  return {
    ok: true,
    body: {
      ...(draft.cardholderId ? { cardholderId: draft.cardholderId } : {}),
      issuedOn: draft.issuedOn,
      closedOn: draft.closedOn,
    },
  };
}

/** The holder picker's options; the picker shows only when the account has more than one holder. */
export function holderOptions(holders: readonly Cardholder[], isBank: boolean): { value: string; label: string }[] {
  return holders.map((h) => ({ value: h.id, label: holderName(h, isBank) }));
}

export function primaryHolderId(holders: readonly Cardholder[]): string {
  return (holders.find((h) => h.role === 'PRIMARY') ?? holders[0])?.id ?? '';
}

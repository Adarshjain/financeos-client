import { formatMoney } from '@/lib/format';
import type { CounterpartyResponse, CounterpartySelection, CreateLendingRequest } from '@/lib/lending.types';
import { fromEntryType, type LendingEntryType } from '@/lib/lendingEntry';

/** "Owes you ₹1,200" / "You owe ₹500" / "Settled" / "No entries yet". */
export function positionLabel(cp: CounterpartyResponse): string {
  if (cp.entryCount === 0) return 'No entries yet';
  if (cp.netPosition > 0) return `Owes you ${formatMoney(cp.netPosition, { decimals: 'auto' })}`;
  if (cp.netPosition < 0) return `You owe ${formatMoney(-cp.netPosition, { decimals: 'auto' })}`;
  return 'Settled';
}

/** "1 entry", "3 entries". */
export function entriesLabel(count: number): string {
  return `${count} ${count === 1 ? 'entry' : 'entries'}`;
}

/** What stops an entry from being saved, as the sentence the form shows; null when it can be saved. */
export function lendingEntryProblem(
  party: CounterpartySelection | null,
  amount: string,
): { field: 'party' | 'amount'; message: string } | null {
  if (!party) return { field: 'party', message: 'Pick a person' };
  const value = Number(amount);
  if (!amount || !Number.isFinite(value) || value <= 0) return { field: 'amount', message: 'Amount must be greater than zero' };
  return null;
}

export interface LendingEntryFields {
  party: CounterpartySelection;
  entryType: LendingEntryType;
  amount: string;
  entryDate: string;
  expectedReturnDate: string;
  notes: string;
  transactionId?: string;
}

/** The POST /lendings body: an existing person by id, a new one by name. */
export function buildCreateLendingRequest(f: LendingEntryFields): CreateLendingRequest {
  return {
    ...(f.party.kind === 'new' ? { newCounterpartyName: f.party.name } : { counterpartyId: f.party.counterparty.id }),
    ...fromEntryType(f.entryType),
    amount: Number(f.amount),
    entryDate: f.entryDate,
    expectedReturnDate: f.expectedReturnDate || undefined,
    transactionId: f.transactionId,
    notes: f.notes.trim() || undefined,
  };
}

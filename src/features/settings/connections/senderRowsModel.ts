import { bankById } from '@/features/banks/banks';
import type { GmailSenderResponse } from '@/lib/api/types';

export type SenderRow =
  | { kind: 'sender'; id: string; sender: GmailSenderResponse }
  | {
      kind: 'bank';
      id: string;
      bankId: string;
      bankName: string;
      senders: GmailSenderResponse[];
      enabled: boolean;
      /** "Any address at hdfcbank.net and 2 more" */
      summary: string;
    };

/** The domain part of a sender entry: what follows the @, or the entry itself when it is a bare domain. */
export function senderDomain(address: string): string {
  const at = address.lastIndexOf('@');
  return at >= 0 ? address.slice(at + 1) : address;
}

/** One row per bank for senders that carry a bank origin (in first-seen order); the rest stay single rows. */
export function groupSenderRows(senders: GmailSenderResponse[]): SenderRow[] {
  const rows: SenderRow[] = [];
  const banks = new Map<string, Extract<SenderRow, { kind: 'bank' }>>();
  for (const sender of senders) {
    const bankId = sender.bankId ?? null;
    if (!bankId) {
      rows.push({ kind: 'sender', id: sender.id, sender });
      continue;
    }
    let row = banks.get(bankId);
    if (!row) {
      row = {
        kind: 'bank',
        id: `bank:${bankId}`,
        bankId,
        bankName: bankById(bankId)?.name ?? bankId,
        senders: [],
        enabled: false,
        summary: '',
      };
      banks.set(bankId, row);
      rows.push(row);
    }
    row.senders.push(sender);
  }
  for (const row of banks.values()) {
    row.enabled = row.senders.some((s) => s.enabled);
    const more = row.senders.length - 1;
    row.summary = `Any address at ${senderDomain(row.senders[0].senderAddress)}${more > 0 ? ` and ${more} more` : ''}`;
  }
  return rows;
}

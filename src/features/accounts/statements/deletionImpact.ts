import type { components } from '@/lib/api/schema';

export type StatementDeletionPreview = components['schemas']['StatementDeletionPreviewResponse'];

/** One bullet: `lead` is the count the Legacy dialog shows in bold; the rest is plain. */
export interface ImpactItem {
  lead?: string;
  text: string;
}

function count(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}

/** What deleting a statement removes and what stays, from the server's preview. */
export function deletionImpactItems(preview: StatementDeletionPreview): ImpactItem[] {
  const items: ImpactItem[] = [];
  items.push(
    preview.transactionsToDelete > 0
      ? {
          lead: count(preview.transactionsToDelete, 'transaction', 'transactions'),
          text: ' it created will be deleted.',
        }
      : { text: 'It created no transactions that only this statement covers, so none will be deleted.' }
  );
  if (preview.linkedToRecords > 0) {
    items.push({
      text: `${count(preview.linkedToRecords, 'of them is', 'of them are')} linked to a loan, lending, dividend or transfer. Those records stay but lose the link.`,
    });
  }
  if (preview.transactionsKept > 0) {
    items.push({
      text: `${count(preview.transactionsKept, 'transaction', 'transactions')} it only matched (email alerts, manual entries, or rows another statement also covers) will stay.`,
    });
  }
  if (preview.alertsToReopen > 0) {
    items.push({
      text: `${count(preview.alertsToReopen, 'email alert goes', 'email alerts go')} back to review as unreconciled.`,
    });
  }
  return items;
}

/** The line under the impact list: how to bring the statement back. */
export function deletionNote(source: 'gmail' | 'file_upload'): string {
  return source === 'gmail'
    ? "Gmail won't fetch this statement again on its own. Upload its PDF to import it again."
    : 'You can upload the same file again afterwards.';
}

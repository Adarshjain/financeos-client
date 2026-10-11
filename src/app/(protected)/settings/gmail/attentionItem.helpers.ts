import type { Schemas } from '@/lib/api/types';
import { formatDate } from '@/lib/utils';

export type AttentionItem = Schemas['PageGmailAttentionItemResponse']['content'][number];

export interface AttentionDescription {
  /** Short status chip text. */
  label: string;
  /** What happened, in plain words. */
  summary: string;
  /** What the user can do about it. */
  hint: string;
}

const NO_KEYS = /no (active )?llm api keys|add an api key/i;
const DECRYPT_FAILED = /could not be decrypted/i;
const STATEMENT_PARSE = /^statement parse failed/i;
const EXTRACTION = /^extraction failed/i;

function cardRef(item: AttentionItem): string | null {
  return item.extractedLast4 ? `••${item.extractedLast4}` : null;
}

/** Turns a ledger row's status + raw error into a label, a plain-words summary and a next step. */
export function describeAttentionItem(item: AttentionItem): AttentionDescription {
  const ref = cardRef(item);

  if (item.status === 'UNRESOLVED_ACCOUNT') {
    return {
      label: 'No matching account',
      summary: ref
        ? `The email is for an account or card ending ${ref}, and none of your accounts (or more than one) match it.`
        : 'The email did not name an account or card number, so it could not be matched to an account.',
      hint: ref
        ? 'Assign it to the right account, or add that account first and retry.'
        : 'Retry after adding the account, or archive it if it is not a transaction.',
    };
  }

  if (item.status === 'ACCOUNT_NOT_OPTED_IN') {
    const account = item.accountName ?? (ref ? `the account ending ${ref}` : 'an account');
    return {
      label: 'Gmail import off',
      summary: `Matched ${account}, but Gmail import is not turned on for it.`,
      hint: 'Edit the account and set its Ingest From Date to pick this email up.',
    };
  }

  const error = item.error ?? '';
  if (NO_KEYS.test(error)) {
    return {
      label: 'No AI key',
      summary: 'The email could not be read because no AI key was set up when it was processed.',
      hint: 'Add a key under Settings → AI keys & routing, then retry.',
    };
  }
  if (DECRYPT_FAILED.test(error)) {
    return {
      label: 'Locked statement',
      summary: 'The statement attachment is password-protected and none of your saved statement passwords opened it.',
      hint: "Edit the card's account and set its Statement Password, then retry.",
    };
  }
  if (STATEMENT_PARSE.test(error)) {
    return {
      label: 'Statement unreadable',
      summary: 'The statement attachment was opened but could not be parsed.',
      hint: 'Retry; if it keeps failing, upload the statement by hand.',
    };
  }
  if (EXTRACTION.test(error)) {
    return {
      label: 'Could not read email',
      summary: 'The AI could not extract a transaction from this email.',
      hint: 'Retry later, or archive it if it is not a transaction.',
    };
  }
  return {
    label: 'Failed',
    summary: `Processing failed after ${item.attemptCount} ${item.attemptCount === 1 ? 'attempt' : 'attempts'}.`,
    hint: 'Retry, or archive it if it is not a transaction.',
  };
}

/** Date plus time, for instants where the hour matters ("last tried"). */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return `${formatDate(d)}, ${d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}`;
}

/** Opens the source email in the mailbox it came from. */
export function gmailMessageUrl(item: AttentionItem): string {
  const authuser = encodeURIComponent(item.connectionEmail);
  return `https://mail.google.com/mail/?authuser=${authuser}#all/${encodeURIComponent(item.gmailMessageId)}`;
}

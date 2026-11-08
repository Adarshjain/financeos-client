import { pageHref, parsePage } from '@/features/shell/pagination';
import { appHref } from '@/features/shell/routes';
import { first, type SearchParamsRecord } from '@/features/shell/searchParams';
import { importHeldHref } from '@/features/transactions/import/importModel';
import type { ImportKind, ImportRecordResponse } from '@/lib/api/types';
import { formatCount, formatDate } from '@/lib/format';

export const IMPORTS_HREF = appHref('/data-sources/imports');
export const IMPORTS_SIZE_OPTIONS = [25, 50, 100];

/** The kind filter: '' is every kind. The values are the server's `kind` values. */
export const KIND_OPTIONS: { label: string; value: '' | ImportKind }[] = [
  { label: 'All', value: '' },
  { label: 'Statements', value: 'statement' },
  { label: 'NPS', value: 'nps_statement' },
  { label: 'EPF', value: 'epf_passbook' },
  { label: 'Broker', value: 'broker' },
];

export interface ImportsUrl {
  /** 0-based page. */
  page: number;
  size: number;
  /** '' for every kind; an unknown value is every kind. */
  kind: '' | ImportKind;
}

/** What a /data-sources/imports address asks for: the page, the size and the kind (the address counts pages from 1). */
export function parseImportsUrl(params: SearchParamsRecord): ImportsUrl {
  const { page, size } = parsePage(params, { sizes: IMPORTS_SIZE_OPTIONS });
  const kind = first(params.kind) ?? '';
  return { page, size, kind: KIND_OPTIONS.some((o) => o.value === kind) ? (kind as ImportsUrl['kind']) : '' };
}

/** The Imports address for a kind, page and size; the defaults leave their keys out. */
export function importsUrl(state: { kind: '' | ImportKind; size: number }, page = 0): string {
  const query: Record<string, string | undefined> = {
    kind: state.kind || undefined,
    size: state.size === IMPORTS_SIZE_OPTIONS[0] ? undefined : String(state.size),
  };
  return pageHref(IMPORTS_HREF, query, page);
}

/** Where failed imports are listed with their errors. */
const FAILED_HREF = appHref('/data-sources/sync?status=failed');

const COUNT_UNIT: Record<string, readonly [string, string]> = {
  statement: ['transaction', 'transactions'],
  nps_statement: ['contribution', 'contributions'],
  epf_passbook: ['entry', 'entries'],
};

export interface ImportRow {
  id: string;
  /** What it was: "HDFC Bank statement", "EPF passbook". */
  title: string;
  /** File name or "From Gmail", period and count; for a file that did not land, the file name and what went wrong. */
  detail: string;
  /** "13 Oct": when it was imported. */
  date: string;
  /** A word for an import that did not finish; none for one that is done. */
  status?: { tone: 'danger' | 'warning'; label: string };
  /** Where something useful is for this import; none when there is nowhere to go. */
  href?: string;
}

function titleOf(r: ImportRecordResponse): string {
  const name = r.accountName || '';
  switch (r.kind) {
    case 'statement':
      return name ? `${name} statement` : 'Statement';
    case 'nps_statement':
      return name ? `${name} NPS statement` : 'NPS statement';
    case 'epf_passbook':
      return 'EPF passbook';
    default:
      return name ? `${name} import` : 'Broker import';
  }
}

function periodOf(r: ImportRecordResponse): string {
  if (!r.periodStart || !r.periodEnd) return '';
  return `${formatDate(r.periodStart, 'list')}–${formatDate(r.periodEnd, 'list')}`;
}

function hrefOf(r: ImportRecordResponse): string | undefined {
  if (r.status === 'failed') return FAILED_HREF;
  if (r.status === 'held') return importHeldHref(r.id.replace(/^held:/, ''));
  switch (r.kind) {
    case 'statement':
      return r.accountId ? appHref(`/accounts/${r.accountId}/statements`) : undefined;
    case 'nps_statement':
      return appHref(`/investments/nps${r.accountId ? `?account=${r.accountId}` : ''}`);
    case 'epf_passbook':
      return appHref('/investments/epf');
    default:
      return appHref('/investments/tradebook');
  }
}

/** One import as a row: what it was, where it came from, when, and a word when it did not finish. */
export function importRow(r: ImportRecordResponse): ImportRow {
  const source = r.fileName || (r.source === 'gmail' ? 'From Gmail' : '');
  const failed = r.status === 'failed' || r.status === 'held';
  const parts =
    failed
      ? [source, r.errorMessage]
      : [source, periodOf(r), r.count != null && COUNT_UNIT[r.kind] ? formatCount(r.count, COUNT_UNIT[r.kind]) : ''];
  return {
    id: r.id,
    title: titleOf(r),
    detail: parts.filter(Boolean).join(' · '),
    date: formatDate(r.createdAt, 'list'),
    status:
      r.status === 'failed'
        ? { tone: 'danger', label: "Couldn't import" }
        : r.status === 'held'
          ? { tone: 'warning', label: 'Waiting for an account' }
          : undefined,
    href: hrefOf(r),
  };
}

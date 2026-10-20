import type { MatchType } from '@/lib/rules.types';

export const MATCH_TYPE_META: Record<
  MatchType,
  { label: string; chip: string; placeholder: string; help: string }
> = {
  MERCHANT_KEY: {
    label: 'Merchant key (smart contains)',
    chip: 'Key',
    placeholder: 'e.g. STARBUCKS',
    help: 'Matches descriptions containing this text after cleanup — numbers, punctuation, and noise words (UPI, POS…) are ignored. At least 3 letters.',
  },
  CONTAINS: {
    label: 'Contains text',
    chip: 'Contains',
    placeholder: 'e.g. UPI-AUTOPAY/042',
    help: 'Matches descriptions containing this exact text anywhere, case-insensitively. Numbers and punctuation count.',
  },
  STARTS_WITH: {
    label: 'Starts with',
    chip: 'Starts with',
    placeholder: 'e.g. ACH/',
    help: 'Matches descriptions beginning with this exact text, case-insensitively.',
  },
  EXACT: {
    label: 'Exact match',
    chip: 'Exact',
    placeholder: 'e.g. NEFT SALARY CREDIT',
    help: 'Matches only descriptions that are exactly this text, case-insensitively.',
  },
  REGEX: {
    label: 'Regex',
    chip: 'Regex',
    placeholder: 'e.g. NEFT.*(HDFC|ICICI)',
    help: 'Matches descriptions where this regular expression finds a match, case-insensitively. Max 200 characters.',
  },
};

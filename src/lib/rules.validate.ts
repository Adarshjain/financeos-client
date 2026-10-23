import type { MatchType } from '@/lib/rules.types';

/** Why a pattern cannot be saved for its match type, or null when it can. */
export function validatePattern(
  matchType: MatchType,
  pattern: string
): string | null {
  const trimmed = pattern.trim();
  if (matchType === 'MERCHANT_KEY') {
    if (trimmed.replace(/[^a-zA-Z]/g, '').length < 3) {
      return 'Merchant key must contain at least 3 letters (ignoring numbers, spaces, and punctuation).';
    }
  } else if (matchType === 'CONTAINS' || matchType === 'STARTS_WITH') {
    if (trimmed.length < 3) return 'Pattern must be at least 3 characters.';
  } else if (matchType === 'EXACT') {
    if (trimmed.length === 0) return 'Pattern must not be empty.';
  } else if (matchType === 'REGEX') {
    if (trimmed.length === 0) return 'Pattern must not be empty.';
    if (trimmed.length > 200)
      return 'Regex pattern must be at most 200 characters.';
    try {
      new RegExp(trimmed, 'i');
    } catch {
      return 'Invalid regular expression.';
    }
  }
  if (trimmed.length > 255) return 'Pattern must be at most 255 characters.';
  return null;
}

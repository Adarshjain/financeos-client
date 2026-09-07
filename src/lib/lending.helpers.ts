/**
 * Tokenises a free-text string for fuzzy counterparty matching: lowercase,
 * strip everything but letters/digits, split on whitespace, and drop tokens
 * shorter than 3 characters (initials, connectors like "to"/"re" are too
 * noisy to match on).
 */
function tokenize(input: string): string[] {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s]+/g, ' ')
    .split(/\s+/)
    .filter((token) => token.length >= 3);
}

/**
 * Suggests a counterparty for a transaction's description by scoring each
 * counterparty's name tokens against the text's tokens and picking the
 * highest-overlap match. Returns null when no counterparty has at least one
 * token in common with the text (or when there's nothing to match against).
 * Ties keep whichever counterparty appears first in the input list.
 */
export function suggestCounterparty(
  text: string | null | undefined,
  counterparties: { id: string; name: string }[],
): string | null {
  if (!text) return null;
  const textTokens = new Set(tokenize(text));
  if (textTokens.size === 0) return null;

  let bestId: string | null = null;
  let bestScore = 0;

  for (const cp of counterparties) {
    const nameTokens = tokenize(cp.name);
    if (nameTokens.length === 0) continue;
    const score = nameTokens.filter((token) => textTokens.has(token)).length;
    if (score > bestScore) {
      bestScore = score;
      bestId = cp.id;
    }
  }

  return bestScore >= 1 ? bestId : null;
}

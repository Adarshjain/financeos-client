import type { Schemas } from '@/lib/api/types';
import type { Dividend } from '@/lib/types';

/**
 * Receipt-reconciliation response shapes, derived from the generated schema so
 * they cannot drift from the server. The only override is `dividend`, typed as
 * the app's `Dividend` (a `DividendResponse` is assignable to it) so the rows
 * plug into the existing table/dialog components.
 */
export type TransactionResponse = Schemas['TransactionResponse'];

export type DividendMatchCandidate = Schemas['DividendMatchCandidate'];
export type MatchTier = DividendMatchCandidate['tier'];
export type MatchReason = DividendMatchCandidate['reasons'][number];

export type DividendMatchItem = Omit<Schemas['DividendReconciliationItem'], 'dividend'> & {
  dividend: Dividend;
};

export type DividendReconciliation = Omit<Schemas['DividendReconciliationResponse'], 'items'> & {
  items: DividendMatchItem[];
};

export type ConfirmItem = Schemas['ConfirmDividendMatchItem'];

export type ConfirmResult = Omit<Schemas['ConfirmDividendMatchesResponse'], 'linked'> & {
  linked: Dividend[];
};

export type HoldingHint = Schemas['DividendHoldingHint'];
export type UnrecordedCredit = Schemas['UnrecordedDividendCredit'];
export type UnrecordedCredits = Schemas['UnrecordedDividendCreditsResponse'];

// These mirror generated schema shapes field-for-field; re-exported as aliases
// instead of hand-duplicated so a server change can't silently drift the two.
export type {
  CounterpartyResponse,
  CreateCounterpartyRequest,
  CreateLendingRequest,
  LendingResponse,
  ObligationsResponse,
  UpdateCounterpartyRequest,
  UpdateLendingRequest,
} from '@/lib/api/types';
import type { Schemas } from '@/lib/api/types';

export type LendingDirection = 'lent' | 'borrowed';

export type ObligationItemDto = Schemas['ObligationItemDto'];

// Not (yet) named exports on '@/lib/api/types' — aliased directly off Schemas
// rather than editing that shared file, which this feature doesn't own.
export type LendingTransactionSummary = Schemas['LendingTransactionSummary'];
export type LinkLendingTransactionRequest = Schemas['LinkLendingTransactionRequest'];

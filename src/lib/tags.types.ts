import type { Schemas } from '@/lib/api/types';

/** A user's own label on transactions (the old per-user categories). */
export type Tag = Schemas['TagResponse'];
export type TagRequest = Schemas['TagRequest'];

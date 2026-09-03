// Mirrors the generated schema shape field-for-field; re-exported instead of
// hand-duplicated so a server change can't silently drift the two.
export type { Category, CategoryRequest } from '@/lib/api/types';

/**
 * The generated `CategorizeResponse` schema marks `mcc`/`ruleId` as plain
 * `string` (required), but the server only sets them when a rule actually
 * matched (`fromRule`) — a springdoc nullability gap, not the real
 * contract — so this stays hand-typed rather than aliased.
 */
export interface CategorizeResponse {
  categories: import('@/lib/api/types').Category[];
  ruleId: string | null;
  fromRule: boolean;
  mcc?: string | null;
}
import type { LlmRoutingGroupDto, Schemas } from '@/lib/api/types';

import type { CustomModelInput } from './useLlmRoutingEditor';

export type RoutingGroupType = 'chat' | 'default';

/** One routing group's draft and handlers, flattened out of `useLlmRoutingEditor` (which keeps chat and default apart). */
export interface RoutingGroupEditor {
  group: RoutingGroupType;
  dto: LlmRoutingGroupDto;
  editing: boolean;
  draft: Schemas['RoutingEntryRequest'][];
  saving: boolean;
  resetting: boolean;
  /** A custom model is being probed. */
  testing: boolean;
  addError: string | null;
  onStart: () => void;
  onCancel: () => void;
  onSave: () => void;
  onReset: () => void;
  onMove: (index: number, delta: number) => void;
  onRemove: (index: number) => void;
  onAdd: (input: CustomModelInput) => Promise<boolean>;
}

import { CardholderRelationship } from '@/lib/account.types';

export const RELATIONSHIP_LABELS: Record<CardholderRelationship, string> = {
  SELF: 'Self (Primary)',
  SPOUSE: 'Spouse',
  CHILD: 'Child',
  PARENT: 'Parent',
  SIBLING: 'Sibling',
  OTHER: 'Other',
};

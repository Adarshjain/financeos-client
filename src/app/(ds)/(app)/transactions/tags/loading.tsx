import React from 'react';

import { RulesSkeleton } from '@/features/transactions/rules/RulesSkeleton';

/** Shown while the rules load. */
export default function DsRulesLoading() {
  return <RulesSkeleton />;
}

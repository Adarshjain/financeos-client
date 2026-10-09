import React from 'react';

import type { RuleMatchTransaction } from '@/lib/rules.types';

interface RuleLinkLabelProps {
  txn: Pick<RuleMatchTransaction, 'appliedRuleId' | 'appliedRuleName'>;
  /** The rule being viewed or edited; omitted while creating a new rule. */
  ruleId?: string | null;
}

/**
 * Which rule a matched transaction currently follows. Editing a rule only
 * reaches transactions linked to it, so this tells the rows Apply would take
 * over apart from the ones already on the rule.
 */
export function RuleLinkLabel({ txn, ruleId }: RuleLinkLabelProps) {
  let label: string;
  if (!txn.appliedRuleId) {
    label = '(not linked to a rule)';
  } else if (ruleId && txn.appliedRuleId === ruleId) {
    label = '(already this rule)';
  } else {
    label = txn.appliedRuleName ? `(rule: ${txn.appliedRuleName})` : '(another rule)';
  }
  return <span className="ml-1.5 text-2xs text-slate-400">{label}</span>;
}

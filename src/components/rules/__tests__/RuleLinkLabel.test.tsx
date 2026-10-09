import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { RuleLinkLabel } from '@/components/rules/RuleLinkLabel';

describe('RuleLinkLabel', () => {
  it('marks a transaction linked to the rule being viewed', () => {
    render(<RuleLinkLabel txn={{ appliedRuleId: 'r1', appliedRuleName: 'Swiggy' }} ruleId="r1" />);
    expect(screen.getByText('(already this rule)')).toBeInTheDocument();
  });

  it('names the other rule a transaction is linked to', () => {
    render(<RuleLinkLabel txn={{ appliedRuleId: 'r2', appliedRuleName: 'Instamart' }} ruleId="r1" />);
    expect(screen.getByText('(rule: Instamart)')).toBeInTheDocument();
  });

  it('falls back to a generic label when the other rule has no name', () => {
    render(<RuleLinkLabel txn={{ appliedRuleId: 'r2', appliedRuleName: null }} ruleId="r1" />);
    expect(screen.getByText('(another rule)')).toBeInTheDocument();
  });

  it('marks a transaction no rule is linked to', () => {
    render(<RuleLinkLabel txn={{ appliedRuleId: null, appliedRuleName: null }} ruleId="r1" />);
    expect(screen.getByText('(not linked to a rule)')).toBeInTheDocument();
  });

  it('treats every linked transaction as another rule while creating', () => {
    render(<RuleLinkLabel txn={{ appliedRuleId: 'r1', appliedRuleName: 'Swiggy' }} />);
    expect(screen.getByText('(rule: Swiggy)')).toBeInTheDocument();
  });
});

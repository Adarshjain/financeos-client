import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import {
  ReviewTypeBadge,
  StatementVerdictBadge,
} from '@/components/statements/StatementBadges';

describe('StatementBadges', () => {
  it('renders StatementVerdictBadge for all verdict types', () => {
    const { rerender } = render(<StatementVerdictBadge verdict="AUTO_INGEST" />);
    expect(screen.getByText('Auto Ingested')).toBeInTheDocument();

    rerender(<StatementVerdictBadge verdict="NEEDS_REVIEW" />);
    expect(screen.getByText('Needs Review')).toBeInTheDocument();

    rerender(<StatementVerdictBadge verdict="REJECTED" />);
    expect(screen.getByText('Rejected')).toBeInTheDocument();

    rerender(<StatementVerdictBadge verdict="FAILED" />);
    expect(screen.getByText('FAILED')).toBeInTheDocument();

    rerender(<StatementVerdictBadge verdict={'UNKNOWN' as any} />);
    expect(screen.getByText('UNKNOWN')).toBeInTheDocument();
  });

  it('renders ReviewTypeBadge for all review types', () => {
    const { rerender } = render(<ReviewTypeBadge reviewType="AUTO_REVIEWED" />);
    expect(screen.getByText('Auto Reviewed')).toBeInTheDocument();

    rerender(<ReviewTypeBadge reviewType="MANUALLY_REVIEWED" />);
    expect(screen.getByText('Manually Reviewed')).toBeInTheDocument();

    rerender(<ReviewTypeBadge reviewType="NEEDS_REVIEW" />);
    expect(screen.getByText('Needs Review')).toBeInTheDocument();

    rerender(<ReviewTypeBadge reviewType={'UNKNOWN' as any} />);
    expect(screen.getByText('UNKNOWN')).toBeInTheDocument();
  });
});

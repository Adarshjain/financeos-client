import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { ReviewReasonBadges } from '@/components/transactions/ReviewReasonBadges';

describe('ReviewReasonBadges (CD-5)', () => {
  it('renders nothing when reviewType is not NEEDS_REVIEW', () => {
    const { container } = render(<ReviewReasonBadges reviewType="MANUALLY_REVIEWED" />);
    expect(container.firstChild).toBeNull();
  });

  it('renders generic Needs Review badge when no reasons are provided', () => {
    render(<ReviewReasonBadges reviewType="NEEDS_REVIEW" reviewReasons={[]} />);
    expect(screen.getByText('Needs Review')).toBeInTheDocument();
  });

  it('renders specific reason badges for provided reasons', () => {
    render(
      <ReviewReasonBadges
        reviewType="NEEDS_REVIEW"
        reviewReasons={['UNRECONCILED', 'CATEGORY_UNVERIFIED']}
      />,
    );

    expect(screen.getByText('Unreconciled')).toBeInTheDocument();
    expect(screen.getByText('Category unverified')).toBeInTheDocument();
  });

  it('renders fallback badge when unknown reason is passed', () => {
    render(
      <ReviewReasonBadges
        reviewType="NEEDS_REVIEW"
        reviewReasons={['CUSTOM_REASON' as any]}
      />,
    );

    expect(screen.getByText('CUSTOM_REASON')).toBeInTheDocument();
  });
});

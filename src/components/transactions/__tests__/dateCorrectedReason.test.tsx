import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { REASON_OPTIONS } from '@/components/transactions/review-filter-bar/constants';
import { ReviewReasonBadges } from '@/components/transactions/ReviewReasonBadges';
import { REVIEW_REASON_META, reviewReasonLabel } from '@/features/transactions/catalog';

// DATE_CORRECTED: the server capped an email alert's date to the day the email was sent.
describe('DATE_CORRECTED review reason', () => {
  it('has a label and short label', () => {
    expect(reviewReasonLabel('DATE_CORRECTED')).toBe('Date corrected');
    expect(REVIEW_REASON_META.DATE_CORRECTED.shortLabel).toBe('Date');
  });

  it('renders as a badge next to the other reasons', () => {
    render(<ReviewReasonBadges reviewType="NEEDS_REVIEW" reviewReasons={['UNRECONCILED', 'DATE_CORRECTED']} />);

    expect(screen.getByText('Unreconciled')).toBeInTheDocument();
    expect(screen.getByText('Date corrected')).toBeInTheDocument();
  });

  it('is offered as a review filter', () => {
    expect(REASON_OPTIONS).toContainEqual({ label: 'Date corrected', shortLabel: 'Date', value: 'DATE_CORRECTED' });
  });
});

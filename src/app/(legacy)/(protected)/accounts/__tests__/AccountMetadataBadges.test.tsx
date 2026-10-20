import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { AccountMetadataBadges } from '../components/AccountMetadataBadges';

const base = { id: 'a', name: 'A', financialPosition: 'asset', warnings: [] };

describe('AccountMetadataBadges "Sync Active"', () => {
  it('shows for a bank account with an ingest watermark', () => {
    render(<AccountMetadataBadges account={{ ...base, type: 'bank_account', ingestFromDate: '2026-01-01' } as any} />);
    expect(screen.getByText('Sync Active')).toBeInTheDocument();
  });

  it('shows for a credit card with an ingest watermark', () => {
    render(<AccountMetadataBadges account={{ ...base, type: 'credit_card', ingestFromDate: '2026-01-01' } as any} />);
    expect(screen.getByText('Sync Active')).toBeInTheDocument();
  });

  it('hides for a bank account without a watermark', () => {
    render(<AccountMetadataBadges account={{ ...base, type: 'bank_account', ingestFromDate: null } as any} />);
    expect(screen.queryByText('Sync Active')).toBeNull();
  });

  it.each(['broker', 'generic'])(
    'never shows for %s accounts, even when a stale ingestFromDate rides along',
    (type) => {
      render(<AccountMetadataBadges account={{ ...base, type, ingestFromDate: '2025-03-01' } as any} />);
      expect(screen.queryByText('Sync Active')).toBeNull();
    }
  );
});

import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { AccountType } from '@/lib/types';

import { SyncConfigSection } from '../SyncConfigSection';

function renderSection(accountType: AccountType) {
  render(
    <SyncConfigSection
      accountType={accountType}
      excludeFromNetAsset={false}
      setExcludeFromNetAsset={vi.fn()}
    />
  );
}

describe('SyncConfigSection ingest watermark field', () => {
  it.each([AccountType.BANK_ACCOUNT, AccountType.CREDIT_CARD])(
    'shows "Ingest From Date" under "Configurations & Sync" for %s',
    (type) => {
      renderSection(type);
      expect(screen.getByText('Configurations & Sync')).toBeInTheDocument();
      expect(screen.getByLabelText(/Ingest From Date/)).toBeInTheDocument();
      expect(screen.getByText(/Gmail transactions import from this date/)).toBeInTheDocument();
    }
  );

  it.each([AccountType.BROKER, AccountType.GENERIC])(
    'omits the field and titles the card "Configuration" for %s, keeping position and exclude toggle',
    (type) => {
      renderSection(type);
      expect(screen.getByText('Configuration')).toBeInTheDocument();
      expect(screen.queryByText('Configurations & Sync')).toBeNull();
      expect(screen.queryByLabelText(/Ingest From Date/)).toBeNull();
      expect(screen.queryByText(/Gmail transactions import from this date/)).toBeNull();
      expect(screen.getByText('Financial Position')).toBeInTheDocument();
      expect(screen.getByText('Exclude from Net Asset')).toBeInTheDocument();
    }
  );
});

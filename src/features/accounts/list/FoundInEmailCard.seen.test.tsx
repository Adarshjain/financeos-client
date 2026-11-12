import { screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
  usePathname: () => '/accounts',
  useSearchParams: () => new URLSearchParams(),
}));

import { formatDate } from '@/lib/format';
import { renderWithQuery } from '@/test/renderWithQuery';

import { FoundInEmailCard } from './FoundInEmailCard';
import { mergeSuggestions,splitSuggestions, type SuggestionItem } from './suggestionsModel';

const item = (over: Partial<SuggestionItem>): SuggestionItem => ({
  id: 's1',
  kind: 'BANK_ACCOUNT',
  kindConf: 'HIGH',
  band: 'FOUND',
  bank: { id: 'hdfc', name: 'HDFC Bank' },
  last4: '4821',
  variant: null,
  variantConf: null,
  parentAccount: null,
  candidateAccount: null,
  children: [],
  caption: '',
  ...over,
});

function renderCard(items: SuggestionItem[]) {
  const suggestions = mergeSuggestions(splitSuggestions(items, []));
  return renderWithQuery(<FoundInEmailCard suggestions={suggestions} />);
}

describe('Found in your email: evidence line', () => {
  it('shows the email count, the dates, the bank and the number on each row', () => {
    renderCard([
      item({ evidenceMails: 5, firstSeenOn: '2026-01-02', lastSeenOn: '2026-03-09' }),
      item({ id: 's2', last4: '1111', evidenceMails: 1, firstSeenOn: '2026-02-02', lastSeenOn: '2026-02-02' }),
    ]);
    expect(screen.getByText(`Seen in 5 emails from ${formatDate('2026-01-02', 'list')} to ${formatDate('2026-03-09', 'list')}`)).toBeInTheDocument();
    expect(screen.getByText(`Seen in 1 email on ${formatDate('2026-02-02', 'list')}`)).toBeInTheDocument();
    expect(screen.getByText('From your HDFC Bank emails · ••4821')).toBeInTheDocument();
  });

  it('shows no evidence line when the server counted no emails', () => {
    renderCard([item({ evidenceMails: null })]);
    expect(screen.queryByText(/Seen in/)).toBeNull();
  });
});

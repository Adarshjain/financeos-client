import { screen, waitFor } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { renderWithQuery } from '@/test/renderWithQuery';

import { useNeedsReviewCount } from './useNeedsReviewCount';

const load = vi.hoisted(() => vi.fn());
vi.mock('@/features/transactions/list/transactionsActions', () => ({ loadNeedsReviewCount: load }));

function Probe() {
  const { data } = useNeedsReviewCount();
  return <p>{data === undefined ? 'loading' : `count ${data}`}</p>;
}

describe('useNeedsReviewCount', () => {
  it('reads the count through the server action', async () => {
    load.mockResolvedValue({ success: true, data: 25 });
    renderWithQuery(<Probe />);
    await waitFor(() => expect(screen.getByText('count 25')).toBeInTheDocument());
  });
});

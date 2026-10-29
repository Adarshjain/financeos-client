import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { renderWithQuery } from '@/test/renderWithQuery';

import { InstrumentSelect, type InstrumentSelectProps } from './InstrumentSelect';

const catalog = vi.hoisted(() => ({ results: [] as unknown[], resolve: vi.fn(), settling: false }));
vi.mock('./instruments/useCatalogSearch', () => ({
  useCatalogSearch: (query: string) => ({
    results: query.trim().length >= 2 && !catalog.settling ? catalog.results : [],
    isLoading: false,
    // The real hook only answers once typing has paused (its debounce).
    hasQuery: query.trim().length >= 2 && !catalog.settling,
  }),
  useResolveInstrumentMutation: () => ({ mutateAsync: catalog.resolve, isPending: false }),
}));

const toast = vi.fn();
vi.mock('@/components/ds/Toast/Toast', async (orig) => ({
  ...(await orig<typeof import('@/components/ds/Toast/Toast')>()),
  showToast: (...args: unknown[]) => toast(...args),
}));

const user = userEvent.setup({ pointerEventsCheck: 0 });
const onValueChange = vi.fn();

function Harness(props: Partial<InstrumentSelectProps>) {
  const [value, setValue] = React.useState<InstrumentSelectProps['value']>(null);
  return (
    <InstrumentSelect
      value={value}
      onValueChange={(i) => {
        onValueChange(i);
        setValue(i);
      }}
      {...props}
    />
  );
}

async function search() {
  await user.click(screen.getByRole('combobox', { name: /Instrument/ }));
  await user.type(await screen.findByPlaceholderText('Search by name or symbol'), 'infy');
}

beforeEach(() => {
  vi.clearAllMocks();
  catalog.settling = false;
  catalog.results = [
    { source: 'LOCAL', type: 'stock', name: 'Infosys', symbol: 'INFY', existingInstrumentId: 'i-infy' },
    { source: 'YAHOO', type: 'stock', name: 'Infosys Ltd ADR', symbol: 'INFY.US', yahooSymbol: 'INFY' },
  ];
  catalog.resolve.mockResolvedValue({ id: 'i-infy', type: 'stock', name: 'Infosys', symbol: 'INFY' });
});

describe('InstrumentSelect', () => {
  it('resolves every pick on the server by default, an entry the user already has included', async () => {
    renderWithQuery(<Harness />);
    await search();
    await user.click(await screen.findByRole('option', { name: /^INFY · Infosys/ }));
    await waitFor(() => expect(onValueChange).toHaveBeenCalledWith(expect.objectContaining({ id: 'i-infy' })));
    expect(catalog.resolve).toHaveBeenCalledWith(expect.objectContaining({ existingInstrumentId: 'i-infy' }));
  });

  it('uses an entry the user already has as it is when asked not to resolve it', async () => {
    renderWithQuery(<Harness resolveExisting={false} />);
    await search();
    await user.click(await screen.findByRole('option', { name: /^INFY · Infosys/ }));
    await waitFor(() => expect(onValueChange).toHaveBeenCalledWith({ id: 'i-infy', name: 'Infosys', symbol: 'INFY' }));
    expect(catalog.resolve).not.toHaveBeenCalled();
  });

  it('still resolves a new feed entry when told not to resolve existing ones', async () => {
    renderWithQuery(<Harness resolveExisting={false} />);
    await search();
    await user.click(await screen.findByRole('option', { name: /Infosys Ltd ADR/ }));
    await waitFor(() => expect(catalog.resolve).toHaveBeenCalledWith(expect.objectContaining({ yahooSymbol: 'INFY' })));
  });

  it('toasts a failed pick, or hands the message to onResolveError', async () => {
    catalog.resolve.mockRejectedValue(new Error('bad'));
    const { unmount } = renderWithQuery(<Harness />);
    await search();
    await user.click(await screen.findByRole('option', { name: /^INFY · Infosys/ }));
    await waitFor(() => expect(toast).toHaveBeenCalledWith("Couldn't add the instrument. Try again.", { tone: 'danger' }));
    unmount();

    const onResolveError = vi.fn();
    toast.mockClear();
    renderWithQuery(<Harness onResolveError={onResolveError} />);
    await search();
    await user.click(await screen.findByRole('option', { name: /^INFY · Infosys/ }));
    await waitFor(() => expect(onResolveError).toHaveBeenCalledWith("Couldn't add the instrument. Try again."));
    expect(toast).not.toHaveBeenCalled();
  });

  it('shows "Enter it manually" only when asked, and calls it when pressed', async () => {
    const onEnterManually = vi.fn();
    const { unmount } = renderWithQuery(<Harness />);
    await user.click(screen.getByRole('combobox', { name: /Instrument/ }));
    expect(screen.queryByRole('button', { name: 'Enter it manually' })).toBeNull();
    unmount();

    renderWithQuery(<Harness onEnterManually={onEnterManually} />);
    await user.click(screen.getByRole('combobox', { name: /Instrument/ }));
    await user.click(await screen.findByRole('button', { name: 'Enter it manually' }));
    expect(onEnterManually).toHaveBeenCalled();
  });

  it('says Searching, not "No instruments match", while the search waits for typing to pause', async () => {
    catalog.settling = true;
    renderWithQuery(<Harness />);
    await search();
    expect(await screen.findByText('Searching…')).toBeTruthy();
    expect(screen.queryByText('No instruments match')).toBeNull();
  });

  it('says No instruments match once the search has answered with nothing', async () => {
    catalog.results = [];
    renderWithQuery(<Harness />);
    await search();
    expect(await screen.findByText('No instruments match')).toBeTruthy();
  });
});

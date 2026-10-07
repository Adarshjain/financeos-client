import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/api/client', async () => {
  const actual = await vi.importActual<typeof import('@/lib/api/client')>('@/lib/api/client');
  return { ...actual, api: { GET: vi.fn(), POST: vi.fn(), PUT: vi.fn(), PATCH: vi.fn(), DELETE: vi.fn() } };
});

import { api } from '@/lib/api/client';
import type { CounterpartyResponse, CounterpartySelection } from '@/lib/lending.types';
import { COUNTERPARTY_SEARCH_PAGE_SIZE } from '@/lib/query/hooks/useCounterparties';
import { renderWithQuery } from '@/test/renderWithQuery';

import { CounterpartyPicker, positionLabel } from '../CounterpartyPicker';

type Mock = ReturnType<typeof vi.fn>;

// Radix Popover (floating-ui) and cmdk need these in jsdom.
global.ResizeObserver = class ResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
};
window.HTMLElement.prototype.scrollIntoView = vi.fn();

function cp(overrides: Partial<CounterpartyResponse> & { id: string; name: string }): CounterpartyResponse {
  return { netPosition: 0, totalLent: 0, totalBorrowed: 0, repaidToYou: 0, repaidByYou: 0, entryCount: 0, ...overrides };
}

const rahul = cp({ id: 'cp-rahul', name: 'Rahul Sharma', netPosition: 1200, totalLent: 1200, entryCount: 2 });
const priya = cp({ id: 'cp-priya', name: 'Priya Nair', netPosition: -500, totalBorrowed: 500, entryCount: 1 });
const amit = cp({ id: 'cp-amit', name: 'Amit Verma', netPosition: 0, totalLent: 300, totalBorrowed: 300, entryCount: 4 });

function pagedOf<T>(content: T[], totalElements = content.length) {
  return {
    content,
    number: 0,
    size: COUNTERPARTY_SEARCH_PAGE_SIZE,
    totalElements,
    totalPages: totalElements > 0 ? 1 : 0,
    first: true,
    last: true,
    empty: content.length === 0,
  };
}

/** Routes GET /counterparties by its `q` param (undefined when unfiltered). */
function mockSearch(byQuery: Record<string, CounterpartyResponse[] | ReturnType<typeof pagedOf>>) {
  (api.GET as Mock).mockImplementation((path: string, opts?: { params?: { query?: { q?: string } } }) => {
    if (path !== '/api/v1/counterparties') return Promise.resolve({ data: null });
    const q = opts?.params?.query?.q ?? '';
    const value = byQuery[q] ?? [];
    return Promise.resolve({ data: Array.isArray(value) ? pagedOf(value) : value });
  });
}

function renderPicker(props: Partial<React.ComponentProps<typeof CounterpartyPicker>> = {}) {
  const onChange = vi.fn();
  const utils = renderWithQuery(
    <CounterpartyPicker id="cpSelect" value={null} onChange={onChange} {...props} />,
  );
  return { ...utils, onChange };
}

async function openList() {
  fireEvent.click(screen.getByRole('combobox', { name: /Person/ }));
  return screen.findByPlaceholderText('Type a name...');
}

describe('positionLabel', () => {
  it('describes who owes whom, settled, and no-entries', () => {
    expect(positionLabel(rahul)).toBe('Owes you ₹1,200.00');
    expect(positionLabel(priya)).toBe('You owe ₹500.00');
    expect(positionLabel(amit)).toBe('Settled');
    expect(positionLabel(cp({ id: 'x', name: 'X' }))).toBe('No entries yet');
  });
});

describe('CounterpartyPicker — empty state (searching)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a labelled trigger and does not query until opened', () => {
    mockSearch({ '': [rahul] });
    renderPicker();

    expect(screen.getByRole('combobox', { name: /Person/ })).toHaveTextContent('Search or add a person');
    expect(api.GET).not.toHaveBeenCalled();
  });

  it('opening lists the first page with name, position and entry count, unfiltered', async () => {
    mockSearch({ '': [rahul, priya, amit] });
    renderPicker();

    await openList();

    const list = await screen.findByRole('listbox');
    await waitFor(() => expect(within(list).getAllByRole('option')).toHaveLength(3));
    expect(within(list).getByText('Rahul Sharma')).toBeInTheDocument();
    expect(within(list).getByText('Owes you ₹1,200.00 · 2 entries')).toBeInTheDocument();
    expect(within(list).getByText('You owe ₹500.00 · 1 entry')).toBeInTheDocument();
    expect(within(list).getByText('Settled · 4 entries')).toBeInTheDocument();
    expect(api.GET).toHaveBeenCalledWith('/api/v1/counterparties', {
      params: { query: { page: 0, size: COUNTERPARTY_SEARCH_PAGE_SIZE } },
    });
  });

  it('typing searches server-side with q and shows only the matches', async () => {
    mockSearch({ '': [rahul, priya, amit], rah: [rahul] });
    renderPicker();

    const input = await openList();
    await screen.findByText('Priya Nair');
    fireEvent.change(input, { target: { value: 'rah' } });

    await waitFor(() =>
      expect(api.GET).toHaveBeenCalledWith('/api/v1/counterparties', {
        params: { query: { page: 0, size: COUNTERPARTY_SEARCH_PAGE_SIZE, q: 'rah' } },
      }),
    );
    await waitFor(() => expect(screen.queryByText('Priya Nair')).not.toBeInTheDocument());
    expect(screen.getByText('Rahul Sharma')).toBeInTheDocument();
  });

  it('picking a row hands back the existing counterparty and closes the list', async () => {
    mockSearch({ '': [rahul, priya] });
    const { onChange } = renderPicker();

    await openList();
    fireEvent.click(await screen.findByText('Priya Nair'));

    expect(onChange).toHaveBeenCalledWith({ kind: 'existing', counterparty: priya });
    await waitFor(() => expect(screen.queryByPlaceholderText('Type a name...')).not.toBeInTheDocument());
  });

  it('offers to add the typed name when nobody matches it exactly', async () => {
    mockSearch({ '': [rahul], Kavita: [] });
    const { onChange } = renderPicker();

    const input = await openList();
    fireEvent.change(input, { target: { value: '  Kavita ' } });

    const addRow = await screen.findByText('Add “Kavita”');
    fireEvent.click(addRow);

    expect(onChange).toHaveBeenCalledWith({ kind: 'new', name: 'Kavita' });
  });

  it('offers to add even when the typed text partially matches someone', async () => {
    mockSearch({ '': [rahul], Rahul: [rahul] });
    renderPicker();

    const input = await openList();
    fireEvent.change(input, { target: { value: 'Rahul' } });

    expect(await screen.findByText('Add “Rahul”')).toBeInTheDocument();
    expect(screen.getByText('Rahul Sharma')).toBeInTheDocument();
  });

  it('does not offer to add a name that already exists (case-insensitive)', async () => {
    mockSearch({ '': [rahul], 'rahul sharma': [rahul] });
    renderPicker();

    const input = await openList();
    fireEvent.change(input, { target: { value: 'rahul sharma' } });

    await waitFor(() =>
      expect(api.GET).toHaveBeenCalledWith(
        '/api/v1/counterparties',
        expect.objectContaining({ params: { query: expect.objectContaining({ q: 'rahul sharma' }) } }),
      ),
    );
    expect(screen.getByText('Rahul Sharma')).toBeInTheDocument();
    expect(screen.queryByText(/^Add /)).not.toBeInTheDocument();
  });

  it('shows an empty hint when there are no people and nothing typed', async () => {
    mockSearch({ '': [] });
    renderPicker();

    await openList();

    expect(await screen.findByText('No people yet. Type a name to add one.')).toBeInTheDocument();
    expect(screen.queryByRole('option')).not.toBeInTheDocument();
  });

  it('flags the suggested counterparty in the list', async () => {
    mockSearch({ '': [rahul, priya] });
    renderPicker({ suggestedId: 'cp-rahul' });

    await openList();

    const list = await screen.findByRole('listbox');
    const rahulRow = within(list).getByText('Rahul Sharma').closest('[role="option"]') as HTMLElement;
    expect(within(rahulRow).getByText('Suggested')).toBeInTheDocument();
    const priyaRow = within(list).getByText('Priya Nair').closest('[role="option"]') as HTMLElement;
    expect(within(priyaRow).queryByText('Suggested')).not.toBeInTheDocument();
  });

  it('tells the user to narrow down when more people exist than the page shows', async () => {
    mockSearch({ '': pagedOf([rahul, priya], 37) });
    renderPicker();

    await openList();

    expect(await screen.findByText('Showing 2 of 37. Keep typing to narrow down.')).toBeInTheDocument();
  });

  it('disabled: the trigger cannot be opened', () => {
    mockSearch({ '': [rahul] });
    renderPicker({ disabled: true });

    const trigger = screen.getByRole('combobox', { name: /Person/ });
    expect(trigger).toBeDisabled();
    fireEvent.click(trigger);
    expect(screen.queryByPlaceholderText('Type a name...')).not.toBeInTheDocument();
    expect(api.GET).not.toHaveBeenCalled();
  });
});

describe('CounterpartyPicker — selected chip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSearch({ '': [rahul] });
  });

  it('existing person: shows name, position and Change, which clears the selection', () => {
    const value: CounterpartySelection = { kind: 'existing', counterparty: rahul };
    const { onChange } = renderPicker({ value });

    expect(screen.getByText('Rahul Sharma')).toBeInTheDocument();
    expect(screen.getByText('Owes you ₹1,200.00 · 2 entries')).toBeInTheDocument();
    expect(screen.queryByText('Suggested')).not.toBeInTheDocument();
    expect(screen.queryByText('New')).not.toBeInTheDocument();
    expect(screen.queryByRole('combobox')).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Change' }));
    expect(onChange).toHaveBeenCalledWith(null);
  });

  it('existing person that was suggested carries the Suggested badge', () => {
    renderPicker({ value: { kind: 'existing', counterparty: rahul }, suggestedId: 'cp-rahul' });

    expect(screen.getByText('Suggested')).toBeInTheDocument();
  });

  it('a suggestion for someone else does not mark the chosen person as suggested', () => {
    renderPicker({ value: { kind: 'existing', counterparty: priya }, suggestedId: 'cp-rahul' });

    expect(screen.queryByText('Suggested')).not.toBeInTheDocument();
  });

  it('new person: shows the typed name with a New badge and the save hint', () => {
    renderPicker({ value: { kind: 'new', name: 'Kavita Rao' } });

    expect(screen.getByText('Kavita Rao')).toBeInTheDocument();
    expect(screen.getByText('New')).toBeInTheDocument();
    expect(screen.getByText('Will be added when you save')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Change' })).toBeInTheDocument();
  });

  it('disabled: the chip has no Change button', () => {
    renderPicker({ value: { kind: 'existing', counterparty: rahul }, disabled: true });

    expect(screen.getByText('Rahul Sharma')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Change' })).not.toBeInTheDocument();
  });
});

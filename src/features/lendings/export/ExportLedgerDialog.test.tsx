import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { LendingCycleResponse } from '@/lib/lending.types';
import type { ExportableEntry } from '@/lib/lendingExport';

const toast = vi.fn();
vi.mock('@/components/ds/Toast/Toast', async (orig) => ({
  ...(await orig<typeof import('@/components/ds/Toast/Toast')>()),
  showToast: (...args: unknown[]) => toast(...args),
}));

import { ExportLedgerDialog } from './ExportLedgerDialog';

function entry(
  id: string,
  entryDate: string,
  direction: 'lent' | 'borrowed',
  kind: 'principal' | 'settlement',
  amount: number,
  runningBalance: number,
  extra: Partial<ExportableEntry> = {},
): ExportableEntry {
  return { id, entryDate, direction, kind, amount, runningBalance, ...extra };
}

/** One open cycle. */
const OPEN_LEDGER: ExportableEntry[] = [
  entry('e1', '2026-01-05', 'lent', 'principal', 5000, 5000, { notes: 'Dinner' }),
  entry('e2', '2026-01-18', 'borrowed', 'settlement', 2000, 3000),
  entry('e3', '2026-02-02', 'lent', 'principal', 1000, 4000, { expectedReturnDate: '2026-03-01' }),
];

/** Settled once in the middle: cycle 1 is settled, cycle 2 is open. */
const CYCLED_LEDGER: ExportableEntry[] = [
  entry('c1', '2025-11-12', 'lent', 'principal', 3000, 3000, { cycle: 1 }),
  entry('c2', '2025-11-20', 'borrowed', 'settlement', 3000, 0, { cycle: 1 }),
  entry('c3', '2026-01-05', 'lent', 'principal', 5000, 5000, { cycle: 2 }),
];
const CYCLES: LendingCycleResponse[] = [
  { number: 2, startDate: '2026-01-05', endDate: '2026-01-05', settled: false, entryCount: 1, lent: 5000, received: 0, closing: 5000 },
  { number: 1, startDate: '2025-11-12', endDate: '2025-11-20', settled: true, entryCount: 2, lent: 3000, received: 3000, closing: 0 },
];

function renderDialog(over: Partial<React.ComponentProps<typeof ExportLedgerDialog>> = {}) {
  const onClose = vi.fn();
  render(<ExportLedgerDialog entries={OPEN_LEDGER} theirName="Rahul" defaultMyName="Adarsh" onClose={onClose} {...over} />);
  return { onClose };
}

const preview = () => (screen.getByTestId('ledger-export-preview') as HTMLTextAreaElement).value;
const button = (name: RegExp | string) => screen.getByRole('button', { name });
/** The Switch of an option: found through its label, which points at it. */
const toggle = (name: string) => document.getElementById(screen.getByText(name).closest('label')!.getAttribute('for')!)!;

let writeText: ReturnType<typeof vi.fn>;
function defineNavigator(key: 'clipboard' | 'share', value: unknown) {
  Object.defineProperty(navigator, key, { value, configurable: true, writable: true });
}

beforeEach(() => {
  window.localStorage.clear();
  toast.mockClear();
  writeText = vi.fn().mockResolvedValue(undefined);
  defineNavigator('clipboard', { writeText });
  defineNavigator('share', undefined);
});
afterEach(() => vi.restoreAllMocks());

describe('layout', () => {
  it('has the title, the hint, the entries, the names, the opening balance and the preview', () => {
    renderDialog();
    expect(screen.getByRole('dialog', { name: 'Export ledger' })).toBeInTheDocument();
    expect(screen.getByText('Pick the entries to include. The text below updates as you go.')).toBeInTheDocument();
    expect(screen.getAllByRole('checkbox')).toHaveLength(3);
    expect(screen.getByLabelText('Your name')).toHaveValue('Adarsh');
    expect(screen.getByLabelText('Their name')).toHaveValue('Rahul');
    expect(screen.getByLabelText('Opening balance')).toHaveValue('0');
    expect(screen.getByText('Balance just before the first selected entry.')).toBeInTheDocument();
    expect(screen.getByLabelText('Preview')).toHaveAttribute('readonly');
  });

  it('lists each entry with its date, type, note and amount', () => {
    renderDialog();
    expect(screen.getAllByText('Lent')).toHaveLength(2);
    expect(screen.getByText('They repaid')).toBeInTheDocument();
    expect(screen.getByText('Dinner')).toBeInTheDocument();
    expect(screen.getByText('₹5,000')).toBeInTheDocument();
  });

  it('draws the four include options as switches with the Legacy defaults', () => {
    renderDialog();
    expect(toggle('Include notes')).toBeChecked();
    expect(toggle('Include totals')).toBeChecked();
    expect(toggle('Include expected return dates')).not.toBeChecked();
    expect(toggle('Running balance after each entry')).not.toBeChecked();
    expect(screen.getAllByRole('checkbox')).toHaveLength(3);
  });

  it('shows who owes whom in a disabled select, beside Clear', () => {
    renderDialog();
    const who = screen.getByRole('combobox', { name: 'Who owes' });
    expect(who).toBeDisabled();
    expect(who).toHaveTextContent('Rahul owes Adarsh');
    expect(button('Clear')).toBeInTheDocument();
  });
});

describe('entries choice', () => {
  it('opens with every entry ticked and the full text', () => {
    renderDialog();
    screen.getAllByRole('checkbox').forEach((c) => expect(c).toBeChecked());
    expect(screen.getByTestId('export-selected-count')).toHaveTextContent('3 selected');
    const text = preview();
    expect(text).toContain('Lending ledger · Adarsh & Rahul');
    expect(text).toContain('Adarsh lent Rahul · ₹5,000.00');
    expect(text).toContain('Rahul repaid Adarsh · ₹2,000.00');
    expect(text).toMatch(/\n\nClosing balance: Rahul owes Adarsh ₹4,000\.00$/);
  });

  it('unticking an entry drops its line and re-derives the opening balance', () => {
    renderDialog();
    fireEvent.click(screen.getAllByRole('checkbox')[0]);
    expect(screen.getByTestId('export-selected-count')).toHaveTextContent('2 selected');
    expect(preview()).not.toContain('Adarsh lent Rahul · ₹5,000.00');
    expect(preview()).toContain('Opening balance: Rahul owes Adarsh ₹5,000.00');
    expect(screen.getByLabelText('Opening balance')).toHaveValue('5000');
  });

  it('None empties the selection and disables Copy; All restores it', () => {
    renderDialog();
    fireEvent.click(button('None'));
    expect(screen.getByTestId('export-selected-count')).toHaveTextContent('0 selected');
    expect(preview()).toContain('No entries selected.');
    expect(button('Copy')).toBeDisabled();
    fireEvent.click(button('All'));
    expect(screen.getByTestId('export-selected-count')).toHaveTextContent('3 selected');
    expect(button('Copy')).toBeEnabled();
  });

  it('has no Since last settled link and no Cycle picker when no cycles are passed', () => {
    renderDialog({ entries: CYCLED_LEDGER });
    expect(screen.queryByRole('button', { name: 'Since last settled' })).toBeNull();
    expect(screen.queryByRole('combobox', { name: 'Cycle' })).toBeNull();
    expect(screen.getByTestId('export-selected-count')).toHaveTextContent('3 selected');
  });
});

describe('cycles', () => {
  const pick = async (label: string) => {
    fireEvent.click(screen.getByRole('combobox', { name: 'Cycle' }));
    fireEvent.click(await screen.findByRole('option', { name: label }));
  };

  it('is not offered with a single cycle', () => {
    renderDialog({ entries: OPEN_LEDGER.map((e) => ({ ...e, cycle: 1 })), cycles: [CYCLES[1]] });
    expect(screen.queryByRole('combobox', { name: 'Cycle' })).toBeNull();
  });

  it('starts with every entry and the placeholder when no initial cycle is given', () => {
    renderDialog({ entries: CYCLED_LEDGER, cycles: CYCLES });
    expect(screen.getByTestId('export-selected-count')).toHaveTextContent('3 selected');
    expect(screen.getByRole('combobox', { name: 'Cycle' })).toHaveTextContent('Cycle');
  });

  it('starts with only the initial cycle ticked and shows it as the value', () => {
    renderDialog({ entries: CYCLED_LEDGER, cycles: CYCLES, initialCycle: 2 });
    expect(screen.getByTestId('export-selected-count')).toHaveTextContent('1 selected');
    expect(screen.getByRole('combobox', { name: 'Cycle' })).toHaveTextContent('Cycle 2 · from 5 Jan 26');
    expect(preview()).toContain('Adarsh lent Rahul · ₹5,000.00');
  });

  it('starts with every entry when the initial cycle does not exist or is null', () => {
    renderDialog({ entries: CYCLED_LEDGER, cycles: CYCLES, initialCycle: 9 });
    expect(screen.getByTestId('export-selected-count')).toHaveTextContent('3 selected');
    cleanup();
    renderDialog({ entries: CYCLED_LEDGER, cycles: CYCLES, initialCycle: null });
    expect(screen.getByTestId('export-selected-count')).toHaveTextContent('3 selected');
  });

  it('picking a cycle selects exactly its entries, with the labels from the cycle dates', async () => {
    renderDialog({ entries: CYCLED_LEDGER, cycles: CYCLES });
    fireEvent.click(screen.getByRole('combobox', { name: 'Cycle' }));
    expect(await screen.findByRole('option', { name: 'Cycle 2 · from 5 Jan 26' })).toBeInTheDocument();
    expect(screen.getByRole('option', { name: 'Cycle 1 · 12 Nov 25 – 20 Nov 25' })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('option', { name: 'Cycle 1 · 12 Nov 25 – 20 Nov 25' }));
    expect(screen.getByTestId('export-selected-count')).toHaveTextContent('2 selected');
    expect(preview()).toContain('Adarsh lent Rahul · ₹3,000.00');
    expect(preview()).not.toContain('₹5,000.00');
  });

  it('goes back to the placeholder after a manual change of the selection', async () => {
    renderDialog({ entries: CYCLED_LEDGER, cycles: CYCLES, initialCycle: 2 });
    fireEvent.click(screen.getAllByRole('checkbox')[0]);
    expect(screen.getByRole('combobox', { name: 'Cycle' })).toHaveTextContent('Cycle');
    expect(screen.getByRole('combobox', { name: 'Cycle' })).not.toHaveTextContent('from 5 Jan 26');
    await pick('Cycle 1 · 12 Nov 25 – 20 Nov 25');
    fireEvent.click(button('All'));
    expect(screen.getByRole('combobox', { name: 'Cycle' })).not.toHaveTextContent('12 Nov 25');
  });
});

describe('opening balance', () => {
  it('Clear leaves the opening line out and says so; Reset brings the derived value back', () => {
    renderDialog();
    fireEvent.click(button('Clear'));
    expect(screen.getByLabelText('Opening balance')).toHaveValue('');
    expect(preview()).not.toContain('Opening balance:');
    expect(screen.getByText(/Not included/)).toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Opening balance'), { target: { value: '1200' } });
    expect(preview()).toContain('Opening balance: Rahul owes Adarsh ₹1,200.00');
    expect(screen.getByText(/Edited\./)).toBeInTheDocument();
    fireEvent.click(button('Reset'));
    expect(screen.getByLabelText('Opening balance')).toHaveValue('0');
  });
});

describe('opening balance expressions', () => {
  it('evaluates an expression into the opening line', () => {
    renderDialog();
    fireEvent.change(screen.getByLabelText('Opening balance'), { target: { value: '1000+200' } });
    expect(preview()).toContain('Opening balance: Rahul owes Adarsh ₹1,200.00');
    expect(screen.queryByText('Enter a valid amount.')).toBeNull();
  });

  it('shows an error and blocks Copy and Share for an invalid expression instead of dropping the line', async () => {
    defineNavigator('share', vi.fn());
    renderDialog();
    for (const bad of ['5+', '100/0', '100-200']) {
      fireEvent.change(screen.getByLabelText('Opening balance'), { target: { value: bad } });
      expect(screen.getByText('Enter a valid amount.')).toBeInTheDocument();
      expect(button('Share')).toBeDisabled();
      expect(button('Copy')).toBeDisabled();
    }
    fireEvent.change(screen.getByLabelText('Opening balance'), { target: { value: '300' } });
    expect(screen.queryByText('Enter a valid amount.')).toBeNull();
    expect(button('Share')).not.toBeDisabled();
  });
});

describe('include switches', () => {
  it('Include notes off drops the note lines', () => {
    renderDialog();
    expect(preview()).toContain('Dinner');
    fireEvent.click(toggle('Include notes'));
    expect(preview()).not.toContain('Dinner');
  });

  it('Include expected return dates adds the date to the entry that has one', () => {
    renderDialog();
    expect(preview()).not.toMatch(/expected/i);
    fireEvent.click(toggle('Include expected return dates'));
    expect(preview()).toMatch(/expected/i);
  });

  it('Include totals off drops the totals lines', () => {
    renderDialog();
    expect(preview()).toMatch(/Total/i);
    fireEvent.click(toggle('Include totals'));
    expect(preview()).not.toMatch(/Total/i);
  });

  it('Running balance after each entry adds a balance to each line', () => {
    renderDialog();
    const before = preview();
    fireEvent.click(toggle('Running balance after each entry'));
    expect(preview().length).toBeGreaterThan(before.length);
    expect(preview()).toMatch(/balance/i);
  });

  it('the names change the wording', () => {
    renderDialog();
    fireEvent.change(screen.getByLabelText('Your name'), { target: { value: '' } });
    expect(preview()).toContain('I lent Rahul');
  });
});

describe('Copy and Share', () => {
  it('where the browser cannot share, Copy is the primary action and copies the text', async () => {
    renderDialog();
    expect(screen.queryByRole('button', { name: 'Share' })).toBeNull();
    fireEvent.click(button('Copy'));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(preview()));
    expect(toast).toHaveBeenCalledWith('Ledger copied', { tone: 'success' });
  });

  it('where it can, Share is primary and Copy sits beside it', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    defineNavigator('share', share);
    renderDialog();
    fireEvent.click(await screen.findByRole('button', { name: 'Share' }));
    await waitFor(() => expect(share).toHaveBeenCalledWith({ title: 'Lending ledger · Adarsh & Rahul', text: preview() }));
    fireEvent.click(button('Copy'));
    await waitFor(() => expect(writeText).toHaveBeenCalled());
  });

  it('copies instead when sharing fails, and says nothing when the share sheet is just closed', async () => {
    defineNavigator('share', vi.fn().mockRejectedValue(new Error('no')));
    renderDialog();
    fireEvent.click(await screen.findByRole('button', { name: 'Share' }));
    await waitFor(() => expect(writeText).toHaveBeenCalled());
    writeText.mockClear();
    toast.mockClear();
    defineNavigator('share', vi.fn().mockRejectedValue(Object.assign(new Error('x'), { name: 'AbortError' })));
    fireEvent.click(screen.getByRole('button', { name: 'Share' }));
    await new Promise((r) => setTimeout(r, 0));
    expect(writeText).not.toHaveBeenCalled();
    expect(toast).not.toHaveBeenCalled();
  });

  it('says how to copy by hand when the clipboard is unavailable', async () => {
    defineNavigator('clipboard', undefined);
    renderDialog();
    fireEvent.click(button('Copy'));
    await waitFor(() =>
      expect(toast).toHaveBeenCalledWith("Couldn't copy the ledger. Select the preview text and copy it manually.", { tone: 'danger' }),
    );
  });

  it('Share is disabled with nothing selected', async () => {
    defineNavigator('share', vi.fn());
    renderDialog();
    fireEvent.click(button('None'));
    expect(await screen.findByRole('button', { name: 'Share' })).toBeDisabled();
  });
});

describe('closing', () => {
  it('closes from the dialog', () => {
    const { onClose } = renderDialog();
    fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
    expect(onClose).toHaveBeenCalled();
  });
});

describe('form submit', () => {
  it('submitting the form copies once, and does nothing when no entry is selected', async () => {
    renderDialog({ entries: [] });
    fireEvent.submit(screen.getByTestId('ledger-export-preview').closest('form')!);
    expect(writeText).not.toHaveBeenCalled();
    cleanup();
    renderDialog();
    fireEvent.submit(screen.getByTestId('ledger-export-preview').closest('form')!);
    await waitFor(() => expect(writeText).toHaveBeenCalledTimes(1));
  });
});

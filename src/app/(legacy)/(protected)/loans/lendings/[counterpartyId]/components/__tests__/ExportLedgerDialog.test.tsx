import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { ExportableEntry } from '@/lib/lendingExport';

vi.mock('sonner', () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

import { toast } from 'sonner';

import { ExportLedgerDialog } from '../ExportLedgerDialog';
import { LENDING_EXPORT_STORAGE_KEY } from '../useExportLedger';

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

/** Never hits zero, so "Since last settled" would equal All and stays hidden. */
const OPEN_LEDGER: ExportableEntry[] = [
  entry('e1', '2026-01-05', 'lent', 'principal', 5000, 5000, { notes: 'Dinner' }),
  entry('e2', '2026-01-18', 'borrowed', 'settlement', 2000, 3000),
  entry('e3', '2026-02-02', 'lent', 'principal', 1000, 4000, { expectedReturnDate: '2026-03-01' }),
];

/** Settled once in the middle, so "Since last settled" picks the tail. */
const CYCLED_LEDGER: ExportableEntry[] = [
  entry('c1', '2025-11-12', 'lent', 'principal', 3000, 3000),
  entry('c2', '2025-11-20', 'borrowed', 'settlement', 3000, 0),
  entry('c3', '2026-01-05', 'lent', 'principal', 5000, 5000),
];

function renderDialog(over: Partial<React.ComponentProps<typeof ExportLedgerDialog>> = {}) {
  const onOpenChange = vi.fn();
  render(
    <ExportLedgerDialog
      open
      onOpenChange={onOpenChange}
      entries={OPEN_LEDGER}
      theirName="Rahul"
      defaultMyName="Adarsh"
      totalEntryCount={OPEN_LEDGER.length}
      {...over}
    />,
  );
  return { onOpenChange };
}

const preview = () => screen.getByTestId('ledger-export-preview').textContent ?? '';
const checkbox = (name: RegExp) => screen.getByRole('checkbox', { name });
const button = (name: RegExp | string) => screen.getByRole('button', { name });

let writeText: ReturnType<typeof vi.fn>;

function defineNavigator(key: 'clipboard' | 'share', value: unknown) {
  Object.defineProperty(navigator, key, { value, configurable: true, writable: true });
}

beforeEach(() => {
  window.localStorage.clear();
  vi.mocked(toast.success).mockClear();
  vi.mocked(toast.error).mockClear();
  writeText = vi.fn().mockResolvedValue(undefined);
  defineNavigator('clipboard', { writeText });
  defineNavigator('share', undefined);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('ExportLedgerDialog — selection', () => {
  it('opens with every entry selected and the full text in the preview', () => {
    renderDialog();

    expect(screen.getAllByRole('checkbox', { name: /₹/ })).toHaveLength(3);
    screen.getAllByRole('checkbox', { name: /₹/ }).forEach((c) => expect(c).toBeChecked());
    expect(screen.getByTestId('export-selected-count')).toHaveTextContent('3 selected');

    const text = preview();
    expect(text).toContain('Lending ledger · Adarsh & Rahul');
    expect(text).toContain('Opening balance: ₹0.00 (settled)');
    expect(text).toContain('Adarsh lent Rahul · ₹5,000.00');
    expect(text).toContain('Rahul repaid Adarsh · ₹2,000.00');
    expect(text).toContain('Adarsh lent Rahul · ₹1,000.00');
    expect(text).toMatch(/\n\nClosing balance: Rahul owes Adarsh ₹4,000\.00$/);
  });

  it('unticking an entry drops its line, updates the count and re-derives the opening balance', () => {
    renderDialog();

    fireEvent.click(checkbox(/Lent ₹5,000\.00/));

    expect(screen.getByTestId('export-selected-count')).toHaveTextContent('2 selected');
    expect(preview()).not.toContain('Adarsh lent Rahul · ₹5,000.00');
    expect(preview()).toContain('Opening balance: Rahul owes Adarsh ₹5,000.00');
    expect(screen.getByLabelText('Opening balance')).toHaveValue('5000');
    expect(preview()).toContain('Closing balance: Rahul owes Adarsh ₹4,000.00');
  });

  it('None empties the selection and disables the actions; All restores it', () => {
    renderDialog();

    fireEvent.click(button('None'));
    expect(screen.getByTestId('export-selected-count')).toHaveTextContent('0 selected');
    expect(preview()).toContain('No entries selected.');
    expect(button('Copy')).toBeDisabled();

    fireEvent.click(button('All'));
    expect(screen.getByTestId('export-selected-count')).toHaveTextContent('3 selected');
    expect(button('Copy')).toBeEnabled();
  });

  it('hides "Since last settled" when it would equal All, shows and applies it otherwise', () => {
    renderDialog();
    expect(screen.queryByRole('button', { name: 'Since last settled' })).not.toBeInTheDocument();
  });

  it('"Since last settled" selects the entries after the last zero balance', () => {
    renderDialog({ entries: CYCLED_LEDGER, totalEntryCount: 3 });

    fireEvent.click(button('Since last settled'));

    expect(screen.getByTestId('export-selected-count')).toHaveTextContent('1 selected');
    expect(checkbox(/Lent ₹3,000\.00/)).not.toBeChecked();
    expect(checkbox(/They repaid ₹3,000\.00/)).not.toBeChecked();
    expect(checkbox(/Lent ₹5,000\.00/)).toBeChecked();
    expect(preview()).toContain('Opening balance: ₹0.00 (settled)');
  });

  it('warns when the page holds fewer entries than the person has', () => {
    renderDialog({ totalEntryCount: 250 });
    expect(screen.getByText('Only the 3 loaded entries can be exported (250 in total).')).toBeInTheDocument();
  });
});

describe('ExportLedgerDialog — names', () => {
  it('prefills both names from the signed-in user and the person', () => {
    renderDialog();
    expect(screen.getByLabelText('Your name')).toHaveValue('Adarsh');
    expect(screen.getByLabelText('Their name')).toHaveValue('Rahul');
  });

  it('blank names fall back to pronouns per party', () => {
    renderDialog();

    fireEvent.change(screen.getByLabelText('Your name'), { target: { value: '' } });
    expect(preview()).toContain('I lent Rahul · ₹5,000.00');
    expect(preview()).toContain('Rahul repaid me · ₹2,000.00');
    expect(preview()).toContain('Lending ledger with Rahul');

    fireEvent.change(screen.getByLabelText('Their name'), { target: { value: '   ' } });
    expect(preview()).toContain('I lent you · ₹5,000.00');
    expect(preview()).toContain('Closing balance: you owe me ₹4,000.00');
    expect(preview().split('\n')[0]).toBe('Lending ledger');
  });

  it('typed names flow into the header and the direction labels', () => {
    renderDialog();

    fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'Me' } });
    fireEvent.change(screen.getByLabelText('Their name'), { target: { value: 'You' } });

    expect(preview()).toContain('Lending ledger · Me & You');
    expect(screen.getByRole('button', { name: 'You owes Me' })).toBeInTheDocument();
  });

  it('remembers "Your name" and the toggles per device, never "Their name"', () => {
    window.localStorage.setItem(
      LENDING_EXPORT_STORAGE_KEY,
      JSON.stringify({ myName: 'Saved Name', toggles: { includeNotes: false } }),
    );
    renderDialog({ defaultMyName: 'Adarsh' });

    expect(screen.getByLabelText('Your name')).toHaveValue('Saved Name');
    expect(screen.getByLabelText('Their name')).toHaveValue('Rahul');
    expect(checkbox(/Include notes/)).not.toBeChecked();
    expect(preview()).not.toContain('Dinner');

    fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'Newer' } });
    const stored = JSON.parse(window.localStorage.getItem(LENDING_EXPORT_STORAGE_KEY) ?? '{}');
    expect(stored.myName).toBe('Newer');
    expect(stored.toggles.includeNotes).toBe(false);
  });

  it('falls back to the display name when nothing is saved, and survives a throwing storage', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('blocked');
    });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('blocked');
    });

    renderDialog({ defaultMyName: 'Adarsh' });
    expect(screen.getByLabelText('Your name')).toHaveValue('Adarsh');
    fireEvent.change(screen.getByLabelText('Your name'), { target: { value: 'Still works' } });
    expect(preview()).toContain('Still works lent Rahul');
  });
});

describe('ExportLedgerDialog — opening balance', () => {
  it('follows the derived default until edited, then Reset restores it', () => {
    renderDialog();
    const amount = screen.getByLabelText('Opening balance');

    expect(amount).toHaveValue('0');
    expect(screen.getByText(/Balance just before the first selected entry/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Reset' })).not.toBeInTheDocument();

    fireEvent.change(amount, { target: { value: '1,00' } });
    expect(amount).toHaveValue('100');
    expect(screen.getByText(/Edited/)).toBeInTheDocument();
    expect(preview()).toContain('Opening balance: Rahul owes Adarsh ₹100.00');
    expect(preview()).toContain('Closing balance: Rahul owes Adarsh ₹4,100.00');

    // Changing the selection no longer moves an edited value.
    fireEvent.click(checkbox(/Lent ₹5,000\.00/));
    expect(amount).toHaveValue('100');

    fireEvent.click(button('Reset'));
    expect(amount).toHaveValue('5000');
    expect(screen.getByText(/Balance just before the first selected entry/)).toBeInTheDocument();
  });

  it('direction control is disabled at zero and flips the phrase otherwise', () => {
    renderDialog();

    expect(button('Rahul owes Adarsh')).toBeDisabled();
    expect(button('Adarsh owes Rahul')).toBeDisabled();

    fireEvent.change(screen.getByLabelText('Opening balance'), { target: { value: '250' } });
    expect(button('Adarsh owes Rahul')).toBeEnabled();

    fireEvent.click(button('Adarsh owes Rahul'));
    expect(preview()).toContain('Opening balance: Adarsh owes Rahul ₹250.00');
    expect(preview()).toContain('Closing balance: Rahul owes Adarsh ₹3,750.00');
  });

  it('Clear omits the opening line and the footer becomes the net of the listed entries', () => {
    renderDialog();

    fireEvent.click(button('Clear'));

    expect(screen.getByLabelText('Opening balance')).toHaveValue('');
    expect(screen.getByText(/Not included/)).toBeInTheDocument();
    expect(button('Rahul owes Adarsh')).toBeDisabled();
    expect(screen.queryByRole('button', { name: 'Clear' })).not.toBeInTheDocument();
    expect(preview()).not.toContain('Opening balance');
    expect(preview()).toContain('Net of listed entries: Rahul owes Adarsh ₹4,000.00');
  });
});

describe('ExportLedgerDialog — toggles', () => {
  it('each toggle changes the preview', () => {
    renderDialog();

    expect(preview()).toContain('   Dinner');
    fireEvent.click(checkbox(/Include notes/));
    expect(preview()).not.toContain('Dinner');

    expect(preview()).not.toContain('expected back by');
    fireEvent.click(checkbox(/Include expected return dates/));
    expect(preview()).toContain('expected back by');

    expect(preview()).toContain('Totals');
    fireEvent.click(checkbox(/Include totals/));
    expect(preview()).not.toContain('Totals');

    expect(preview()).not.toContain('Balance: ');
    fireEvent.click(checkbox(/Running balance after each entry/));
    expect(preview()).toContain('   Balance: Rahul owes Adarsh ₹5,000.00');
  });
});

describe('ExportLedgerDialog — Copy and Share', () => {
  it('without Web Share the footer is Copy + Close; Copy writes the preview text and toasts', async () => {
    renderDialog();

    expect(screen.queryByRole('button', { name: 'Share' })).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'Copy' })).toHaveLength(1);
    expect(button('Close')).toBeInTheDocument();
    fireEvent.click(button('Copy'));

    await waitFor(() => expect(writeText).toHaveBeenCalledWith(preview()));
    expect(toast.success).toHaveBeenCalledWith('Ledger copied');
  });

  it('Close dismisses the dialog without copying or sharing', () => {
    const { onOpenChange } = renderDialog();

    fireEvent.click(button('Close'));

    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(writeText).not.toHaveBeenCalled();
  });

  it('a failing clipboard points at the selectable preview', async () => {
    writeText.mockRejectedValue(new Error('denied'));
    renderDialog();

    fireEvent.click(button('Copy'));

    await waitFor(() =>
      expect(toast.error).toHaveBeenCalledWith('Could not copy — select the preview text and copy it manually'),
    );
    expect(toast.success).not.toHaveBeenCalled();
  });

  it('the preview allows partial text selection (no select-all)', () => {
    renderDialog();
    const pre = screen.getByTestId('ledger-export-preview');
    expect(pre.className).toContain('select-text');
    expect(pre.className).not.toContain('select-all');
  });

  it('with Web Share the footer is Share + Close and Copy moves beside the preview; Share sends title + text', async () => {
    const share = vi.fn().mockResolvedValue(undefined);
    defineNavigator('share', share);
    renderDialog();

    await waitFor(() => expect(screen.getByRole('button', { name: 'Share' })).toBeInTheDocument());
    expect(button('Close')).toBeInTheDocument();
    const copy = button('Copy');
    expect(screen.getByTestId('ledger-export-preview').parentElement).toContainElement(copy);

    fireEvent.click(copy);
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(preview()));

    fireEvent.click(button('Share'));
    await waitFor(() => expect(share).toHaveBeenCalledWith({ title: 'Lending ledger · Adarsh & Rahul', text: preview() }));
    expect(writeText).toHaveBeenCalledTimes(1); // only the explicit Copy above, not Share
  });

  it('a dismissed share sheet is silent; any other share failure falls back to Copy', async () => {
    const abort = Object.assign(new Error('dismissed'), { name: 'AbortError' });
    const share = vi.fn().mockRejectedValueOnce(abort).mockRejectedValueOnce(new Error('boom'));
    defineNavigator('share', share);
    renderDialog();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Share' })).toBeInTheDocument());

    fireEvent.click(button('Share'));
    await waitFor(() => expect(share).toHaveBeenCalledTimes(1));
    expect(writeText).not.toHaveBeenCalled();
    expect(toast.error).not.toHaveBeenCalled();

    fireEvent.click(button('Share'));
    await waitFor(() => expect(writeText).toHaveBeenCalledWith(preview()));
    expect(toast.success).toHaveBeenCalledWith('Ledger copied');
  });

  it('Share and Copy are disabled with nothing selected, Close never is', async () => {
    defineNavigator('share', vi.fn());
    renderDialog();
    await waitFor(() => expect(screen.getByRole('button', { name: 'Share' })).toBeInTheDocument());

    fireEvent.click(button('None'));

    expect(button('Share')).toBeDisabled();
    expect(button('Copy')).toBeDisabled();
    expect(button('Close')).toBeEnabled();
  });
});

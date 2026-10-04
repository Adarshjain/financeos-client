import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import {
  DateInput,
  displayToIso,
  formatTypedDate,
  isoToDisplay,
} from '@/components/ui/date-input';
import { FormField } from '@/components/ui/form-field';

describe('date-input helpers', () => {
  it('converts between ISO and dd/mm/yyyy', () => {
    expect(isoToDisplay('2026-07-05')).toBe('05/07/2026');
    expect(isoToDisplay('')).toBe('');
    expect(isoToDisplay(undefined)).toBe('');
    expect(isoToDisplay('05/07/2026')).toBe('');
    expect(displayToIso('05/07/2026')).toBe('2026-07-05');
  });

  it('rejects incomplete and impossible dates', () => {
    expect(displayToIso('05/07/202')).toBe('');
    expect(displayToIso('31/02/2026')).toBe('');
    expect(displayToIso('00/01/2026')).toBe('');
    expect(displayToIso('12/13/2026')).toBe('');
    expect(displayToIso('29/02/2024')).toBe('2024-02-29');
    expect(displayToIso('29/02/2026')).toBe('');
  });

  it('inserts slashes as digits are typed and caps the year at 4 digits', () => {
    expect(formatTypedDate('1')).toBe('1');
    expect(formatTypedDate('12')).toBe('12');
    expect(formatTypedDate('123')).toBe('12/3');
    expect(formatTypedDate('1234')).toBe('12/34');
    expect(formatTypedDate('12345')).toBe('12/34/5');
    expect(formatTypedDate('1234567890')).toBe('12/34/5678');
  });

  it('keeps a trailing slash and survives backspacing over it', () => {
    expect(formatTypedDate('12/')).toBe('12/');
    expect(formatTypedDate('12/05/')).toBe('12/05/');
    expect(formatTypedDate('12/0')).toBe('12/0');
  });

  it('pads a single-digit day or month when a separator follows it', () => {
    expect(formatTypedDate('1/')).toBe('01/');
    expect(formatTypedDate('1/5/2026')).toBe('01/05/2026');
    expect(formatTypedDate('1-5-2026')).toBe('01/05/2026');
  });

  it('converts a pasted ISO date to dd/mm/yyyy', () => {
    expect(formatTypedDate('2026-07-25')).toBe('25/07/2026');
    expect(formatTypedDate(' 2026-07-25 ')).toBe('25/07/2026');
  });
});

function Controlled({ initial = '', onValue }: { initial?: string; onValue?: (v: string) => void }) {
  const [value, setValue] = useState(initial);
  return (
    <>
      <label htmlFor="d">Date</label>
      <DateInput
        id="d"
        value={value}
        onChange={(e) => {
          setValue(e.target.value);
          onValue?.(e.target.value);
        }}
      />
      <button type="button" onClick={() => setValue('2025-01-31')}>
        set
      </button>
      <button type="button" onClick={() => setValue('')}>
        reset
      </button>
    </>
  );
}

describe('DateInput', () => {
  it('shows a controlled ISO value as dd/mm/yyyy', () => {
    render(<Controlled initial="2026-07-25" />);
    const input = screen.getByLabelText('Date');
    expect(input).toHaveValue('25/07/2026');
    expect(input).toHaveAttribute('placeholder', 'dd/mm/yyyy');
  });

  it('emits ISO once a complete date is typed and "" while incomplete', () => {
    const onValue = vi.fn();
    render(<Controlled onValue={onValue} />);
    const input = screen.getByLabelText('Date');

    fireEvent.change(input, { target: { value: '2507' } });
    expect(input).toHaveValue('25/07');
    expect(onValue).not.toHaveBeenCalled();

    fireEvent.change(input, { target: { value: '25/072026' } });
    expect(input).toHaveValue('25/07/2026');
    expect(onValue).toHaveBeenLastCalledWith('2026-07-25');

    fireEvent.change(input, { target: { value: '25/07/202' } });
    expect(input).toHaveValue('25/07/202');
    expect(onValue).toHaveBeenLastCalledWith('');
  });

  it('accepts an ISO date typed or pasted in', () => {
    const onValue = vi.fn();
    render(<Controlled onValue={onValue} />);
    const input = screen.getByLabelText('Date');
    fireEvent.change(input, { target: { value: '2026-09-01' } });
    expect(input).toHaveValue('01/09/2026');
    expect(onValue).toHaveBeenLastCalledWith('2026-09-01');
  });

  it('flags an impossible date as invalid and emits ""', () => {
    const onValue = vi.fn();
    render(<Controlled initial="2026-02-10" onValue={onValue} />);
    const input = screen.getByLabelText('Date') as HTMLInputElement;
    fireEvent.change(input, { target: { value: '31/02/2026' } });
    expect(onValue).toHaveBeenLastCalledWith('');
    expect(input.validity.valid).toBe(false);
    expect(input.validationMessage).toBe('Enter a valid date as dd/mm/yyyy');
  });

  it('follows outside value changes such as prefill and reset', () => {
    render(<Controlled />);
    const input = screen.getByLabelText('Date');
    fireEvent.click(screen.getByText('set'));
    expect(input).toHaveValue('31/01/2025');
    fireEvent.click(screen.getByText('reset'));
    expect(input).toHaveValue('');
  });

  it('enforces min and max through custom validity', () => {
    const { rerender } = render(
      <DateInput aria-label="d" value="2026-01-01" min="2026-02-01" onChange={() => {}} />,
    );
    const input = screen.getByLabelText('d') as HTMLInputElement;
    expect(input.validationMessage).toBe('Date must be on or after 01/02/2026');

    rerender(<DateInput aria-label="d" value="2026-03-01" max="2026-02-01" onChange={() => {}} />);
    expect(input.validationMessage).toBe('Date must be on or before 01/02/2026');

    rerender(<DateInput aria-label="d" value="2026-02-01" min="2026-02-01" max="2026-02-01" onChange={() => {}} />);
    expect(input.validity.valid).toBe(true);
  });

  it('marks the visible field required so empty forms do not submit', () => {
    render(<DateInput aria-label="d" required value="" onChange={() => {}} />);
    const input = screen.getByLabelText('d') as HTMLInputElement;
    expect(input.required).toBe(true);
    expect(input.validity.valueMissing).toBe(true);
  });

  it('submits the ISO value under `name` when uncontrolled', () => {
    const { container } = render(
      <form>
        <DateInput aria-label="d" name="tradeDate" defaultValue="2026-04-01" />
      </form>,
    );
    const form = container.querySelector('form')!;
    expect(new FormData(form).get('tradeDate')).toBe('2026-04-01');

    fireEvent.change(screen.getByLabelText('d'), { target: { value: '15/08/2026' } });
    expect(new FormData(form).get('tradeDate')).toBe('2026-08-15');

    fireEvent.change(screen.getByLabelText('d'), { target: { value: '15/08' } });
    expect(new FormData(form).get('tradeDate')).toBe('');
  });

  it('exposes `name` on the change event target', () => {
    const onChange = vi.fn();
    render(<DateInput aria-label="d" name="exDate" value="" onChange={onChange} />);
    fireEvent.change(screen.getByLabelText('d'), { target: { value: '01/06/2026' } });
    const event = onChange.mock.calls[0][0];
    expect(event.target.value).toBe('2026-06-01');
    expect(event.target.name).toBe('exDate');
    expect(event.currentTarget.value).toBe('2026-06-01');
  });

  it('picks a date from the calendar popover', () => {
    const onValue = vi.fn();
    render(<Controlled initial="2026-07-25" onValue={onValue} />);
    fireEvent.click(screen.getByRole('button', { name: 'Open calendar' }));
    fireEvent.click(screen.getByRole('button', { name: /July 15th, 2026/ }));
    expect(onValue).toHaveBeenLastCalledWith('2026-07-15');
    expect(screen.getByLabelText('Date')).toHaveValue('15/07/2026');
  });

  it('disables typing and the calendar button when disabled', () => {
    render(<DateInput aria-label="d" disabled value="2026-07-25" onChange={() => {}} />);
    expect(screen.getByLabelText('d')).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Open calendar' })).toBeDisabled();
  });
});

describe('FormField type="date"', () => {
  it('renders the dd/mm/yyyy DateInput wired to its label', () => {
    const onChange = vi.fn();
    render(<FormField label="Ex-Date" name="exDate" type="date" value="2026-06-01" onChange={onChange} />);
    const input = screen.getByLabelText('Ex-Date');
    expect(input).toHaveAttribute('type', 'text');
    expect(input).toHaveValue('01/06/2026');
    fireEvent.change(input, { target: { value: '02/06/2026' } });
    expect(onChange.mock.calls[0][0].target.value).toBe('2026-06-02');
  });

  it('still renders a plain Input for other types', () => {
    render(<FormField label="Qty" name="qty" type="number" defaultValue="3" />);
    expect(screen.getByLabelText('Qty')).toHaveAttribute('type', 'number');
  });
});

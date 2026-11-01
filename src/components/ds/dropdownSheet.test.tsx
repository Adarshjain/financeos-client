import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { DateField } from './DateField/DateField';
import { Menu } from './Menu/Menu';
import { Popover } from './Popover/Popover';
import { Select } from './Select/Select';

const phone = vi.hoisted(() => ({ value: true }));
vi.mock('./phoneLayout', () => ({ isPhoneLayout: () => phone.value, DESKTOP_QUERY: '(min-width: 641px)' }));

const options = [
  { value: 'a', label: 'Alpha' },
  { value: 'b', label: 'Beta' },
];

function touch(target: Element, type: string, x: number, y: number) {
  const t = { identifier: 1, target, clientX: x, clientY: y } as unknown as Touch;
  const ev = new Event(type, { bubbles: true, cancelable: true });
  Object.assign(ev, { touches: type === 'touchend' ? [] : [t], changedTouches: [t] });
  target.dispatchEvent(ev);
}

beforeEach(() => {
  phone.value = true;
});
afterEach(() => {
  document.documentElement.style.removeProperty('--ds-keyboard-inset');
});

describe('dropdown sheets: markup (CSS decides the form)', () => {
  it('Popover content carries the sheet marker and shows its title', () => {
    render(
      <Popover defaultOpen trigger={<button>Open</button>} contentProps={{ title: 'Cards' }}>
        <p>Body</p>
      </Popover>,
    );
    const content = document.querySelector('[data-ds-sheet]') as HTMLElement;
    expect(content).toBeTruthy();
    expect(content).not.toHaveAttribute('title');
    const heading = screen.getByText('Cards');
    expect(heading.parentElement).toHaveClass('desk:hidden');
  });

  it('Popover without a title renders only the handle', () => {
    render(
      <Popover defaultOpen trigger={<button>Open</button>}>
        <p>Body</p>
      </Popover>,
    );
    const header = (document.querySelector('[data-ds-sheet]') as HTMLElement).firstElementChild as HTMLElement;
    expect(header).toHaveClass('desk:hidden');
    expect(header.children).toHaveLength(1);
  });

  it('Menu content carries the marker and title', () => {
    render(
      <Menu defaultOpen trigger={<button>Open</button>} contentProps={{ title: 'Rent' }}>
        <Menu.Item>Edit</Menu.Item>
      </Menu>,
    );
    expect(document.querySelector('[role="menu"][data-ds-sheet]')).toBeTruthy();
    expect(screen.getByText('Rent').parentElement).toHaveClass('desk:hidden');
  });

  it('Select titles its sheet with the label, else the aria-label, else nothing', () => {
    const { rerender } = render(<Select label="Account" options={options} defaultOpen />);
    expect(document.querySelector('[data-ds-sheet]')).toBeTruthy();
    expect(document.querySelector('[data-ds-sheet] .desk\\:hidden')?.textContent).toBe('Account');
    rerender(<Select aria-label="Bank" options={options} defaultOpen />);
    expect(document.querySelector('[data-ds-sheet] .desk\\:hidden')?.textContent).toBe('Bank');
    rerender(<Select options={options} defaultOpen />);
    expect(document.querySelector('[data-ds-sheet] .desk\\:hidden')?.textContent).toBe('');
  });

  it('DateField titles its sheet with the label', () => {
    render(<DateField today="2026-10-13" label="Due date" defaultOpen />);
    expect(document.querySelector('[data-ds-sheet] .desk\\:hidden')?.textContent).toBe('Due date');
  });

  it('keeps the sheet above the keyboard while open', () => {
    render(<Select label="Account" options={options} defaultOpen />);
    expect(document.documentElement.style.getPropertyValue('--ds-keyboard-inset')).toBe('0px');
  });
});

describe('keyboard inset', () => {
  it('is not installed by a closed dropdown', () => {
    render(
      <>
        <Select label="Account" options={options} />
        <Menu trigger={<button>Open</button>}>
          <Menu.Item>Edit</Menu.Item>
        </Menu>
        <Popover trigger={<button>Pop</button>}>
          <p>Body</p>
        </Popover>
      </>,
    );
    expect(document.documentElement.style.getPropertyValue('--ds-keyboard-inset')).toBe('');
  });

  it('is installed while open and removed on close', async () => {
    const user = userEvent.setup();
    render(<Select label="Account" options={options} />);
    await user.click(screen.getByRole('combobox'));
    expect(document.documentElement.style.getPropertyValue('--ds-keyboard-inset')).toBe('0px');
    await user.keyboard('{Escape}');
    await waitFor(() => expect(document.documentElement.style.getPropertyValue('--ds-keyboard-inset')).toBe(''));
  });
});

describe('Select search focus', () => {
  it('does not focus the search on phone', async () => {
    phone.value = true;
    render(<Select label="Account" options={options} searchable defaultOpen />);
    const search = await screen.findByPlaceholderText('Search…');
    await new Promise((r) => setTimeout(r, 50));
    expect(search).not.toHaveFocus();
    expect(document.querySelector('[data-ds-sheet]')).toHaveFocus();
  });

  it('focuses the search on desktop', async () => {
    phone.value = false;
    render(<Select label="Account" options={options} searchable defaultOpen />);
    const search = await screen.findByPlaceholderText('Search…');
    await waitFor(() => expect(search).toHaveFocus());
  });
});

describe('drag to close', () => {
  it('a downward flick on a Select sheet closes it', async () => {
    const onOpenChange = vi.fn();
    render(<Select label="Account" options={options} defaultOpen onOpenChange={onOpenChange} />);
    const row = await screen.findByText('Beta');
    touch(row, 'touchstart', 100, 100);
    touch(row, 'touchmove', 100, 140);
    touch(row, 'touchmove', 100, 220);
    touch(row, 'touchend', 100, 220);
    await waitFor(() => expect(onOpenChange).toHaveBeenCalledWith(false), { timeout: 2000 });
  });

  it('a drag on desktop does nothing', async () => {
    phone.value = false;
    const onOpenChange = vi.fn();
    render(<Select label="Account" options={options} defaultOpen onOpenChange={onOpenChange} />);
    const row = await screen.findByText('Beta');
    touch(row, 'touchstart', 100, 100);
    touch(row, 'touchmove', 100, 140);
    touch(row, 'touchmove', 100, 220);
    touch(row, 'touchend', 100, 220);
    await new Promise((r) => setTimeout(r, 600));
    expect(onOpenChange).not.toHaveBeenCalled();
  });

  it('a click on a row still picks it (the drag is not a click blocker)', async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(<Select label="Account" options={options} defaultOpen onValueChange={onValueChange} />);
    await user.click(await screen.findByText('Beta'));
    expect(onValueChange).toHaveBeenCalledWith('b');
    void fireEvent;
  });
});

import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { TAB_SLOT_COOKIE } from '@/features/shell/tabSlotName';

import { GeneralCard } from './GeneralCard';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({ useRouter: () => ({ refresh, push: vi.fn() }) }));
vi.mock('next-themes', () => ({ useTheme: () => ({ theme: 'light', setTheme: vi.fn() }) }));

beforeEach(() => {
  refresh.mockClear();
});

describe('GeneralCard phone bottom bar', () => {
  it('has a "Phone bottom bar" row, "Second tab", showing the saved slot', () => {
    render(<GeneralCard tabSlot="lending" />);
    expect(screen.getByText('Phone bottom bar', { selector: 'p, span, div' })).toBeInTheDocument();
    expect(screen.getByText('Second tab')).toBeInTheDocument();
    expect(screen.getByRole('combobox', { name: 'Phone bottom bar' })).toHaveTextContent('Lending');
  });

  it('defaults to Accounts', () => {
    render(<GeneralCard />);
    expect(screen.getByRole('combobox', { name: 'Phone bottom bar' })).toHaveTextContent('Accounts');
  });

  it('writes the cookie and refreshes when a slot is picked', () => {
    const set = vi.spyOn(document, 'cookie', 'set');
    render(<GeneralCard />);
    fireEvent.click(screen.getByRole('combobox', { name: 'Phone bottom bar' }));
    for (const name of ['Accounts', 'Lending', 'Investments', 'Upcoming']) {
      expect(screen.getAllByRole('option', { name }).length).toBeGreaterThan(0);
    }
    fireEvent.click(screen.getAllByRole('option', { name: 'Upcoming' })[0]);
    expect(set).toHaveBeenCalledWith(expect.stringContaining(`${TAB_SLOT_COOKIE}=upcoming; path=/; max-age=31536000; samesite=lax`));
    expect(refresh).toHaveBeenCalledTimes(1);
    set.mockRestore();
  });
});

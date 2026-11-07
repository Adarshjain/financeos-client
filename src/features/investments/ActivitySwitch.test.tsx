import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ActivitySwitch } from './ActivitySwitch';

let pathname = '/investments/activity';
const router = { push: vi.fn() };
vi.mock('next/navigation', () => ({ usePathname: () => pathname, useRouter: () => router }));

beforeEach(() => {
  router.push.mockClear();
  pathname = '/investments/activity';
});

const checked = () => screen.getAllByRole('radio').filter((r) => r.getAttribute('aria-checked') === 'true').map((r) => r.textContent);

describe('ActivitySwitch', () => {
  it('offers Trades, Dividends and Corporate actions in order', () => {
    render(<ActivitySwitch />);
    expect(screen.getAllByRole('radio').map((r) => r.textContent)).toEqual(['Trades', 'Dividends', 'Corporate actions']);
  });

  it.each([
    ['/investments/activity', 'Trades'],
    ['/investments/activity/dividends', 'Dividends'],
    ['/investments/activity/corporate-actions', 'Corporate actions'],
  ])('marks the choice of %s', (path, label) => {
    pathname = path;
    render(<ActivitySwitch />);
    expect(checked()).toEqual([label]);
  });

  it('goes to the route of the chosen list', () => {
    render(<ActivitySwitch />);
    fireEvent.click(screen.getByRole('radio', { name: 'Dividends' }));
    expect(router.push).toHaveBeenCalledWith('/investments/activity/dividends');
    fireEvent.click(screen.getByRole('radio', { name: 'Corporate actions' }));
    expect(router.push).toHaveBeenCalledWith('/investments/activity/corporate-actions');
  });

  it('does not navigate when the open choice is pressed again', () => {
    render(<ActivitySwitch />);
    fireEvent.click(screen.getByRole('radio', { name: 'Trades' }));
    expect(router.push).not.toHaveBeenCalled();
  });
});

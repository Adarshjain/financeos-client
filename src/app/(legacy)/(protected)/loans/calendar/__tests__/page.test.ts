import { describe, expect, it, vi } from 'vitest';

const redirect = vi.fn();
vi.mock('next/navigation', () => ({ redirect: (url: string) => redirect(url) }));

import ObligationsCalendarPage from '../page';

describe('/loans/calendar redirect', () => {
  it('redirects to /upcoming', () => {
    ObligationsCalendarPage();
    expect(redirect).toHaveBeenCalledTimes(1);
    expect(redirect).toHaveBeenCalledWith('/upcoming');
  });
});

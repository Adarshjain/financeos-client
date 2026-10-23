import { render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { ConcealProvider } from '../Conceal/Conceal';
import { MonthCalendar } from './MonthCalendar';

const events = [{ id: 'b', date: '2026-10-15', label: 'Amex bill ₹33.9K' }];
const calendar = <MonthCalendar mode="events" today="2026-10-13" month="2026-10-01" events={events} />;

describe('MonthCalendar with hidden amounts', () => {
  it('shows the chip label and its title as they are', () => {
    const { container } = render(calendar);
    expect(container.querySelector('[title]')).toHaveAttribute('title', 'Amex bill ₹33.9K');
  });

  it('hides the amount in the chip label and in its title', () => {
    const { container } = render(<ConcealProvider concealed>{calendar}</ConcealProvider>);
    expect(container.querySelector('[title]')).toHaveAttribute('title', 'Amex bill ₹ —');
    expect(container.textContent).not.toContain('33.9K');
  });
});

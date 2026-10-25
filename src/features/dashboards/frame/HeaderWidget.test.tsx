import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import type { WidgetResponse } from '@/lib/dashboards.types';

import { HeaderWidget } from './HeaderWidget';

const header = (over: Partial<WidgetResponse> = {}): WidgetResponse =>
  ({ id: 'h1', kind: 'text', title: 'This month', params: { description: 'Spend so far' }, layout: { x: 0, y: 0, w: 100, h: 5 }, ...over }) as unknown as WidgetResponse;

describe('HeaderWidget', () => {
  it('draws the title as plain heading text, not a SectionHeader band, with its description under it', () => {
    render(<HeaderWidget widget={header()} />);
    const heading = screen.getByRole('heading', { level: 2, name: 'This month' });
    expect(heading.className).toMatch(/text-heading/);
    expect(heading.className).not.toMatch(/bg-|border-t/);
    expect(screen.getByTestId('dashboard-header').className).not.toMatch(/bg-/);
    expect(screen.getByText('Spend so far')).toBeInTheDocument();
  });

  it('shows a problem under the title in danger tone', () => {
    render(<HeaderWidget widget={header({ title: 'x' })} issue="Give this header a title." />);
    expect(screen.getByText('Give this header a title.')).toBeInTheDocument();
  });

  it('editing keeps the inline title and description fields', async () => {
    const onChange = vi.fn();
    render(<HeaderWidget widget={header()} onChange={onChange} />);
    await userEvent.type(screen.getByLabelText('Header'), '!');
    expect(onChange).toHaveBeenCalledWith({ title: 'This month!' });
    await userEvent.type(screen.getByLabelText(/Description/), '?');
    expect(onChange).toHaveBeenCalledWith({ description: 'Spend so far?' });
  });
});

import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { DashboardWidgetView } from '@/components/dashboards/DashboardWidgetView';
import type { WidgetResponse } from '@/lib/dashboards.types';

describe('DashboardWidgetView', () => {
  const sampleWidget: WidgetResponse = {
    id: 'widget-1',
    reportId: 'rep-123',
    title: 'Monthly Expenses',
    layout: { x: 0, y: 0, w: 6, h: 4 },
    report: {
      name: 'Monthly Expenses Report',
      type: 'TABLE',
      available: true,
    },
  };

  it('renders quick edit report icon link in view mode', () => {
    render(<DashboardWidgetView widget={sampleWidget} />);

    expect(screen.getByText('Monthly Expenses')).toBeInTheDocument();

    const editLinks = screen.getAllByRole('link', { name: /edit report/i });
    expect(editLinks.length).toBeGreaterThanOrEqual(1);
    expect(editLinks[0]).toHaveAttribute('href', '/reports/rep-123');
  });

  it('renders quick edit report icon link in edit mode', () => {
    render(<DashboardWidgetView widget={sampleWidget} editing={true} />);

    const editLink = screen.getByRole('link', { name: /edit report/i });
    expect(editLink).toHaveAttribute('href', '/reports/rep-123');
  });

  it('does not render edit link when report is unavailable', () => {
    const unavailableWidget: WidgetResponse = {
      ...sampleWidget,
      report: {
        name: null,
        type: null,
        available: false,
      },
    };

    render(<DashboardWidgetView widget={unavailableWidget} />);

    expect(screen.queryByRole('link', { name: /edit report/i })).not.toBeInTheDocument();
  });
});

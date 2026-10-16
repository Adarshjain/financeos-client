import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Widget } from './Widget';

describe('Widget', () => {
  it('renders title, subtitle, and body content', () => {
    render(
      <Widget title="Spend this month" subtitle="vs Sep">
        <div>₹97,044</div>
      </Widget>,
    );

    expect(screen.getByText('Spend this month')).toBeInTheDocument();
    expect(screen.getByText('vs Sep')).toBeInTheDocument();
    expect(screen.getByText('₹97,044')).toBeInTheDocument();
  });

  it('renders menu options button when menuItems provided', () => {
    render(
      <Widget
        title="Spend this month"
        menuItems={[{ label: 'Edit report', onSelect: () => {} }]}
      />,
    );

    expect(
      screen.getByRole('button', { name: /widget options/i }),
    ).toBeInTheDocument();
  });

  it('renders loading state without children', () => {
    const { container } = render(
      <Widget title="Upcoming" subtitle="Next 14 days" loading={true}>
        <div>Hidden content</div>
      </Widget>,
    );

    expect(screen.queryByText('Hidden content')).not.toBeInTheDocument();
    expect(container.querySelectorAll('.animate-pulse').length).toBe(3);
  });

  it('renders failed state with messages and retry action', () => {
    const handleRetry = vi.fn();
    render(
      <Widget
        title="Portfolio"
        subtitle="Value and day change"
        errorTitle="Couldn't load this widget"
        error="Prices service did not answer."
        action={{ label: 'Retry', onSelect: handleRetry }}
      />,
    );

    expect(screen.getByRole('alert')).toBeInTheDocument();
    expect(screen.getByText("Couldn't load this widget")).toBeInTheDocument();
    expect(screen.getByText('Prices service did not answer.')).toBeInTheDocument();
    const retryBtn = screen.getByRole('button', { name: /retry/i });
    expect(retryBtn).toHaveClass('text-ink', 'font-bold');
    fireEvent.click(retryBtn);
    expect(handleRetry).toHaveBeenCalledTimes(1);
  });

  it('renders unavailable state with message and remove action', () => {
    const handleRemove = vi.fn();
    render(
      <Widget
        title="Card spend by month"
        subtitle="Report"
        unavailableTitle="This report is no longer available"
        unavailable="Remove the widget or pick another report."
        action={{ label: 'Remove', onSelect: handleRemove }}
      />,
    );

    expect(
      screen.getByText('This report is no longer available'),
    ).toBeInTheDocument();
    expect(
      screen.getByText('Remove the widget or pick another report.'),
    ).toBeInTheDocument();
    const removeBtn = screen.getByRole('button', { name: /remove/i });
    expect(removeBtn).toHaveClass('text-ink', 'font-bold');
    fireEvent.click(removeBtn);
    expect(handleRemove).toHaveBeenCalledTimes(1);
  });
});

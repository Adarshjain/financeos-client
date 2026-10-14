import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { RuleCard } from './RuleCard';

describe('RuleCard', () => {
  it('renders name, pattern, and usedCount', () => {
    render(
      <RuleCard
        name="Dunzo"
        matchType="Contains"
        pattern="DUNZO DAILY"
        usedCount={4}
        categories={['Groceries']}
      />,
    );

    expect(screen.getByText('Dunzo')).toBeInTheDocument();
    expect(screen.getByText(/Contains/)).toBeInTheDocument();
    expect(screen.getByText('DUNZO DAILY')).toBeInTheDocument();
    expect(screen.getByText('4')).toBeInTheDocument();
    expect(screen.getByText('Groceries')).toBeInTheDocument();
  });

  it('renders unverified status and calls onApprove', () => {
    const handleApprove = vi.fn();
    render(
      <RuleCard
        name="Dunzo"
        status="unverified"
        source="LLM-generated"
        onApprove={handleApprove}
      />,
    );

    expect(screen.getByText('Unverified')).toHaveClass('text-warning');
    expect(screen.getByText('LLM-generated')).toBeInTheDocument();
    const approveBtn = screen.getByRole('button', { name: /approve/i });
    fireEvent.click(approveBtn);
    expect(handleApprove).toHaveBeenCalledTimes(1);
  });

  it('renders verified status and omits approve button', () => {
    render(
      <RuleCard
        name="Swiggy"
        status="verified"
        source="Created by you"
        mcc="MCC 5812"
      />,
    );

    expect(screen.getByText('Verified')).toHaveClass('text-brand-strong');
    expect(screen.getByText('Created by you')).toBeInTheDocument();
    expect(screen.getByText('MCC 5812')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /approve/i }),
    ).not.toBeInTheDocument();
  });

  it('renders eye icon and triggers onViewDetail in selection mode', () => {
    const handleView = vi.fn();
    render(
      <RuleCard
        name="Lenskart"
        selectionMode={true}
        onViewDetail={handleView}
      />,
    );

    expect(
      screen.queryByRole('button', { name: /rule actions/i }),
    ).not.toBeInTheDocument();
    const eyeBtn = screen.getByRole('button', { name: /view rule details/i });
    expect(eyeBtn).toBeInTheDocument();
    fireEvent.click(eyeBtn);
    expect(handleView).toHaveBeenCalledTimes(1);
  });

  it('applies selected styles', () => {
    const { container } = render(<RuleCard name="Selected rule" selected />);
    expect(container.firstChild).toHaveClass('bg-brand-tint');
    expect(container.firstChild).toHaveClass('border-brand');
    expect(container.firstChild).toHaveClass('ring-brand');
  });
});

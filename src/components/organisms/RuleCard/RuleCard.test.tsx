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
        matchType="Contains"
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
        matchType="Starts with"
        status="verified"
        source="Created by you"
        mcc="MCC 5812"
      />,
    );

    expect(screen.getByText('Verified')).toBeInTheDocument();
    expect(screen.getByText('Created by you')).toBeInTheDocument();
    expect(screen.getByText('MCC 5812')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /approve/i }),
    ).not.toBeInTheDocument();
  });

  it('renders eye icon and triggers onDetail in selection mode', () => {
    const handleView = vi.fn();
    render(
      <RuleCard
        name="Lenskart"
        matchType="Contains"
        selectionMode={true}
        onDetail={handleView}
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

  it('renders menu items passed via props', () => {
    const handleFind = vi.fn();
    render(
      <RuleCard
        name="Dunzo"
        matchType="Contains"
        menuItems={[
          { label: 'Find matches', onSelect: handleFind },
        ]}
      />,
    );

    const menuBtn = screen.getByRole('button', { name: /rule actions/i });
    expect(menuBtn).toBeInTheDocument();
  });

  it('applies selected styles', () => {
    const { container } = render(
      <RuleCard name="Selected rule" matchType="Contains" selected />,
    );
    expect(container.firstChild).toHaveClass('bg-brand-tint');
    expect(container.firstChild).toHaveClass('border-brand');
    expect(container.firstChild).toHaveClass('ring-brand');
  });

  it('is focusable and interactive when selectable or with onClick', () => {
    const handleClick = vi.fn();
    const { container } = render(
      <RuleCard
        name="Clickable rule"
        matchType="Contains"
        onClick={handleClick}
      />,
    );

    const card = container.firstChild as HTMLElement;
    expect(card).toHaveAttribute('tabIndex', '0');
    expect(card).toHaveClass('cursor-pointer');

    fireEvent.click(screen.getByText('Clickable rule'));
    expect(handleClick).toHaveBeenCalledTimes(1);
  });

  it('toggles selection on card tap when selectable', () => {
    const handleSelectedChange = vi.fn();
    render(
      <RuleCard
        name="Selectable rule"
        matchType="Contains"
        selectable
        selected={false}
        onSelectedChange={handleSelectedChange}
      />,
    );

    fireEvent.click(screen.getByText('Selectable rule'));
    expect(handleSelectedChange).toHaveBeenCalledWith(true);
  });

  it('toggles selection on Enter and Space keys when selectable', () => {
    const handleSelectedChange = vi.fn();
    const { container } = render(
      <RuleCard
        name="Keyboard rule"
        matchType="Contains"
        selectable
        selected={true}
        onSelectedChange={handleSelectedChange}
      />,
    );

    const card = container.firstChild as HTMLElement;
    fireEvent.keyDown(card, { key: 'Enter' });
    expect(handleSelectedChange).toHaveBeenCalledWith(false);

    fireEvent.keyDown(card, { key: ' ' });
    expect(handleSelectedChange).toHaveBeenCalledWith(false);
  });

  it('starts selection on long-press (~450ms)', () => {
    vi.useFakeTimers();
    const handleSelectedChange = vi.fn();
    const { container } = render(
      <RuleCard
        name="Long press rule"
        matchType="Contains"
        selectable
        selected={false}
        onSelectedChange={handleSelectedChange}
      />,
    );

    const card = container.firstChild as HTMLElement;
    fireEvent.touchStart(card, {
      touches: [{ clientX: 100, clientY: 100 }],
    });

    vi.advanceTimersByTime(200);
    expect(handleSelectedChange).not.toHaveBeenCalled();

    vi.advanceTimersByTime(300);
    expect(handleSelectedChange).toHaveBeenCalledWith(true);
    vi.useRealTimers();
  });

  it('cancels long-press when movement exceeds 10px', () => {
    vi.useFakeTimers();
    const handleSelectedChange = vi.fn();
    const { container } = render(
      <RuleCard
        name="Moving rule"
        matchType="Contains"
        selectable
        selected={false}
        onSelectedChange={handleSelectedChange}
      />,
    );

    const card = container.firstChild as HTMLElement;
    fireEvent.touchStart(card, {
      touches: [{ clientX: 100, clientY: 100 }],
    });

    vi.advanceTimersByTime(200);
    // Move 15px vertically
    fireEvent.touchMove(card, {
      touches: [{ clientX: 100, clientY: 115 }],
    });

    vi.advanceTimersByTime(300);
    expect(handleSelectedChange).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('eye control opens detail without toggling selection', () => {
    const handleDetail = vi.fn();
    const handleSelectedChange = vi.fn();
    render(
      <RuleCard
        name="Detail rule"
        matchType="Contains"
        selected
        selectionMode
        onDetail={handleDetail}
        onSelectedChange={handleSelectedChange}
      />,
    );

    const eyeBtn = screen.getByRole('button', {
      name: /view rule details/i,
    });
    fireEvent.click(eyeBtn);

    expect(handleDetail).toHaveBeenCalledTimes(1);
    expect(handleSelectedChange).not.toHaveBeenCalled();
  });

  it('renders desktop checkbox when selectable on desktop', () => {
    const handleSelectedChange = vi.fn();
    render(
      <RuleCard
        name="Desktop rule"
        matchType="Contains"
        selectable
        selected={false}
        onSelectedChange={handleSelectedChange}
      />,
    );

    const checkbox = screen.getByLabelText('Select Desktop rule');
    expect(checkbox).toBeInTheDocument();
    expect(checkbox).not.toBeChecked();

    fireEvent.click(checkbox);
    expect(handleSelectedChange).toHaveBeenCalledWith(true);
  });

  it('supports uncontrolled selection via defaultSelected', () => {
    const handleSelectedChange = vi.fn();
    render(
      <RuleCard
        name="Uncontrolled rule"
        matchType="Contains"
        selectable
        defaultSelected={true}
        onSelectedChange={handleSelectedChange}
      />,
    );

    const checkbox = screen.getByLabelText('Select Uncontrolled rule');
    expect(checkbox).toBeChecked();

    fireEvent.click(checkbox);
    expect(handleSelectedChange).toHaveBeenCalledWith(false);
  });
});

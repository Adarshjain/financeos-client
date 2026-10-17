import { act, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import React from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RuleCard } from './RuleCard';

const giveSize = (el: HTMLElement) => {
  el.getBoundingClientRect = () => ({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: 400,
    bottom: 100,
    width: 400,
    height: 100,
    toJSON() {},
  });
};
const adv = (ms: number) =>
  act(() => {
    vi.advanceTimersByTime(ms);
  });

describe('RuleCard', () => {
  beforeEach(() => {
    vi.stubGlobal('jest', {
      advanceTimersByTime: vi.advanceTimersByTime.bind(vi),
    });
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });
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

  it('does not render eye button when outside selection mode even if selectable and onDetail is passed', () => {
    const handleView = vi.fn();
    render(
      <RuleCard
        name="Lenskart"
        matchType="Contains"
        selectable
        selectionMode={false}
        onDetail={handleView}
      />,
    );
    expect(
      screen.queryByRole('button', { name: /view rule details/i }),
    ).not.toBeInTheDocument();
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

  it('calls onDetail on card tap outside selection mode, and toggles selection in selection mode', async () => {
    const handleSelectedChange = vi.fn();
    const handleDetail = vi.fn();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { rerender, container } = render(
      <RuleCard
        name="Selectable rule"
        matchType="Contains"
        selectable
        selected={false}
        selectionMode={false}
        onDetail={handleDetail}
        onSelectedChange={handleSelectedChange}
      />,
    );

    const card = container.firstChild as HTMLElement;
    giveSize(card);
    await user.pointer({ keys: '[MouseLeft>]', target: card });
    await user.pointer({ keys: '[/MouseLeft]', target: card });
    expect(handleDetail).toHaveBeenCalledTimes(1);
    expect(handleSelectedChange).not.toHaveBeenCalled();

    rerender(
      <RuleCard
        name="Selectable rule"
        matchType="Contains"
        selectable
        selected={false}
        selectionMode={true}
        onDetail={handleDetail}
        onSelectedChange={handleSelectedChange}
      />,
    );

    // A mouse click still opens the detail in selection mode (owner, 2026-10-17)
    await user.pointer({ keys: '[MouseLeft>]', target: card });
    await user.pointer({ keys: '[/MouseLeft]', target: card });
    expect(handleDetail).toHaveBeenCalledTimes(2);
    expect(handleSelectedChange).not.toHaveBeenCalled();

    // A touch tap toggles the selection
    await user.pointer({ keys: '[TouchA>]', target: card });
    await user.pointer({ keys: '[/TouchA]', target: card });
    expect(handleSelectedChange).toHaveBeenCalledWith(true);
    expect(handleDetail).toHaveBeenCalledTimes(2);
  });

  it('toggles selection on Enter and Space keys in selection mode', async () => {
    const handleSelectedChange = vi.fn();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    const { container } = render(
      <RuleCard
        name="Keyboard rule"
        matchType="Contains"
        selectable
        selected={true}
        selectionMode={true}
        onSelectedChange={handleSelectedChange}
      />,
    );

    const card = container.firstChild as HTMLElement;
    card.focus();
    await user.keyboard('{Enter}');
    expect(handleSelectedChange).toHaveBeenCalledWith(false);

    await user.keyboard(' ');
    expect(handleSelectedChange).toHaveBeenCalledTimes(2);
  });

  it('starts selection on long-press (500ms)', async () => {
    const handleSelectedChange = vi.fn();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
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
    giveSize(card);
    await user.pointer({ keys: '[TouchA>]', target: card });

    adv(300);
    expect(handleSelectedChange).not.toHaveBeenCalled();

    adv(200);
    expect(handleSelectedChange).toHaveBeenCalledWith(true);

    await user.pointer({ keys: '[/TouchA]', target: card });
    expect(handleSelectedChange).toHaveBeenCalledTimes(1);
  });

  it('cancels long-press when movement exceeds 10px', async () => {
    const handleSelectedChange = vi.fn();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
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
    giveSize(card);
    await user.pointer({ keys: '[TouchA>]', target: card, coords: { clientX: 100, clientY: 100 } });
    await user.pointer({ target: card, coords: { clientX: 100, clientY: 120 } });
    adv(600);
    await user.pointer({ keys: '[/TouchA]', target: card, coords: { clientX: 100, clientY: 120 } });

    expect(handleSelectedChange).not.toHaveBeenCalled();
  });

  it('pressing Approve calls its handler only', async () => {
    const handleApprove = vi.fn();
    const handleSelectedChange = vi.fn();
    const handleDetail = vi.fn();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <RuleCard
        name="Approve test rule"
        matchType="Contains"
        selectable
        selected={false}
        onApprove={handleApprove}
        onDetail={handleDetail}
        onSelectedChange={handleSelectedChange}
      />,
    );
    const approveBtn = screen.getByRole('button', { name: /approve/i });
    giveSize(approveBtn);
    await user.click(approveBtn);

    expect(handleApprove).toHaveBeenCalledTimes(1);
    expect(handleDetail).not.toHaveBeenCalled();
    expect(handleSelectedChange).not.toHaveBeenCalled();
  });

  it('opening the ⋮ menu does not select the card', async () => {
    const handleSelectMenuItem = vi.fn();
    const handleSelectedChange = vi.fn();
    const handleDetail = vi.fn();
    const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
    render(
      <RuleCard
        name="Menu test rule"
        matchType="Contains"
        selectable
        selected={false}
        menuItems={[{ label: 'Edit rule', onSelect: handleSelectMenuItem }]}
        onDetail={handleDetail}
        onSelectedChange={handleSelectedChange}
      />,
    );
    const menuBtn = screen.getByRole('button', { name: /rule actions/i });
    giveSize(menuBtn);
    await user.click(menuBtn);

    expect(handleDetail).not.toHaveBeenCalled();
    expect(handleSelectedChange).not.toHaveBeenCalled();
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

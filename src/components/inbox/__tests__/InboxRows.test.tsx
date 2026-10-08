import { fireEvent, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { COMMIT_PX } from '@/components/ui/swipe-action-row.helpers';

import { InboxItemRow, inboxRowId } from '../InboxItemRow';
import { InboxRowControls } from '../InboxRowActions';
import { InboxSection } from '../InboxSection';
import { InboxSummaryRow } from '../InboxSummaryRow';
import { action, DISMISS, item, SNOOZE } from './fixtures';

const touch = { pointerType: 'touch', isPrimary: true, pointerId: 1 };

function handlers() {
  return { onBillAction: vi.fn(), onSnooze: vi.fn(), onDismiss: vi.fn() };
}

function swipe(el: HTMLElement, dx: number) {
  fireEvent.pointerDown(el, { ...touch, clientX: 200, clientY: 100 });
  fireEvent.pointerMove(el, { ...touch, clientX: 200 + dx, clientY: 100 });
  fireEvent.pointerUp(el, { ...touch, clientX: 200 + dx, clientY: 100 });
}

describe('InboxItemRow', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-08T06:00:00Z'));
  });
  afterEach(() => vi.useRealTimers());

  const bill = item({
    key: 'card_bill:s1:OVERDUE',
    title: 'HDFC bill overdue',
    subtitle: 'Due 1 Oct',
    amount: 5000,
    date: '2026-10-01',
    severity: 'critical',
    refs: { statementId: 's1' },
    actions: [
      action({ type: 'mark_paid', label: 'Mark paid', payload: { statementId: 's1' } }),
      action({ type: 'open', label: 'Open bill', href: '/upcoming?bill=s1' }),
      SNOOZE,
      DISMISS,
    ],
  });

  it('renders title, subtitle, amount, date, DOM id and severity stripe', () => {
    const { container } = render(<ul><InboxItemRow item={bill} highlighted={false} {...handlers()} /></ul>);
    const li = screen.getByTestId('inbox-item-row');
    expect(li).toHaveAttribute('id', inboxRowId(bill.key));
    expect(li).toHaveAttribute('data-inbox-key', bill.key);
    expect(screen.getByText('HDFC bill overdue')).toBeInTheDocument();
    expect(screen.getByText('Due 1 Oct')).toBeInTheDocument();
    expect(screen.getByText(/5,000/)).toBeInTheDocument();
    expect(screen.getByText('1 Oct 26')).toBeInTheDocument();
    expect(container.querySelector('.bg-rose-500')).not.toBeNull();
  });

  it('omits subtitle, amount and date when absent; zero amount is still shown', () => {
    const { rerender } = render(<ul><InboxItemRow item={item({ key: 'k', title: 'Plain' })} highlighted={false} {...handlers()} /></ul>);
    expect(screen.queryByText('—')).not.toBeInTheDocument();
    expect(screen.queryByText(/₹/)).not.toBeInTheDocument();
    rerender(<ul><InboxItemRow item={item({ key: 'k', title: 'Plain', amount: 0 })} highlighted={false} {...handlers()} /></ul>);
    expect(screen.getByText(/₹\s*0/)).toBeInTheDocument();
  });

  it('highlight adds the emerald ring', () => {
    const { container, rerender } = render(<ul><InboxItemRow item={bill} highlighted {...handlers()} /></ul>);
    expect(container.querySelector('.ring-emerald-500\\/40')).not.toBeNull();
    rerender(<ul><InboxItemRow item={bill} highlighted={false} {...handlers()} /></ul>);
    expect(container.querySelector('.ring-emerald-500\\/40')).toBeNull();
  });

  it('bill action button calls onBillAction; link actions render hrefs; first is primary', () => {
    const h = handlers();
    render(<ul><InboxItemRow item={bill} highlighted={false} {...h} /></ul>);
    fireEvent.click(screen.getByRole('button', { name: 'Mark paid' }));
    expect(h.onBillAction).toHaveBeenCalledWith(bill, bill.actions[0]);
    expect(screen.getByRole('link', { name: 'Open bill' })).toHaveAttribute('href', '/upcoming?bill=s1');
  });

  it('a bill action without a statementId payload is disabled', () => {
    const noStmt = item({ key: 'k', actions: [action({ type: 'mark_paid', label: 'Mark paid' })] });
    render(<ul><InboxItemRow item={noStmt} highlighted={false} {...handlers()} /></ul>);
    expect(screen.getByRole('button', { name: 'Mark paid' })).toBeDisabled();
  });

  it('a navigation action with no href anywhere renders nothing; falls back to the row href', () => {
    const noHref = item({ key: 'a', actions: [action({ type: 'open', label: 'Open' })] });
    const { unmount } = render(<ul><InboxItemRow item={noHref} highlighted={false} {...handlers()} /></ul>);
    expect(screen.queryByRole('link', { name: 'Open' })).not.toBeInTheDocument();
    unmount();
    const rowHref = item({ key: 'b', href: '/loans/1', actions: [action({ type: 'open', label: 'Open' })] });
    render(<ul><InboxItemRow item={rowHref} highlighted={false} {...handlers()} /></ul>);
    expect(screen.getByRole('link', { name: 'Open' })).toHaveAttribute('href', '/loans/1');
  });

  it('dismiss button calls onDismiss; snooze and dismiss are not rendered as primary action buttons', () => {
    const h = handlers();
    render(<ul><InboxItemRow item={bill} highlighted={false} {...h} /></ul>);
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss HDFC bill overdue' }));
    expect(h.onDismiss).toHaveBeenCalledWith(bill);
    expect(screen.getByRole('button', { name: 'Snooze HDFC bill overdue' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: 'Snooze' })).not.toBeInTheDocument();
  });

  it('shows no snooze/dismiss controls when the server offers neither', () => {
    render(<ul><InboxItemRow item={item({ key: 'k', actions: [action({ type: 'open', href: '/x', label: 'Open' })] })} highlighted={false} {...handlers()} /></ul>);
    expect(screen.queryByRole('button', { name: /Snooze|Dismiss/ })).not.toBeInTheDocument();
  });

  it('swipe right snoozes until tomorrow; swipe left dismisses', () => {
    const h = handlers();
    render(<ul><InboxItemRow item={bill} highlighted={false} {...h} /></ul>);
    const content = document.querySelector('[data-slot="swipe-action-row-content"]') as HTMLElement;
    swipe(content, COMMIT_PX + 10);
    expect(h.onSnooze).toHaveBeenCalledWith(bill, '2026-10-09');
    swipe(content, -(COMMIT_PX + 10));
    expect(h.onDismiss).toHaveBeenCalledWith(bill);
  });

  it('swiping right does nothing when the row cannot be snoozed; left nothing when it cannot be dismissed', () => {
    const h = handlers();
    const dismissOnly = item({ key: 'd', actions: [DISMISS] });
    const { unmount } = render(<ul><InboxItemRow item={dismissOnly} highlighted={false} {...h} /></ul>);
    swipe(document.querySelector('[data-slot="swipe-action-row-content"]') as HTMLElement, COMMIT_PX + 10);
    expect(h.onSnooze).not.toHaveBeenCalled();
    unmount();
    const snoozeOnly = item({ key: 's', actions: [SNOOZE] });
    render(<ul><InboxItemRow item={snoozeOnly} highlighted={false} {...h} /></ul>);
    swipe(document.querySelector('[data-slot="swipe-action-row-content"]') as HTMLElement, -(COMMIT_PX + 10));
    expect(h.onDismiss).not.toHaveBeenCalled();
  });
});

describe('InboxSummaryRow', () => {
  const summary = item({
    key: 'review_queue',
    kind: 'review_queue',
    rowType: 'summary',
    section: 'needs_look',
    title: 'Transactions to review',
    count: 42,
    href: '/transactions/review',
    actions: [
      action({ type: 'review', label: 'Review' }),
      action({ type: 'open', label: 'Second', href: '/never' }),
      SNOOZE,
      DISMISS,
    ],
  });

  it('shows title, count badge and only the first primary action', () => {
    render(<ul><InboxSummaryRow item={summary} highlighted={false} {...handlers()} /></ul>);
    expect(screen.getByTestId('inbox-summary-row')).toHaveAttribute('data-inbox-key', 'review_queue');
    expect(screen.getByText('42')).toBeInTheDocument();
    expect(screen.getByRole('link', { name: 'Review' })).toHaveAttribute('href', '/transactions/review');
    expect(screen.queryByRole('link', { name: 'Second' })).not.toBeInTheDocument();
  });

  it('can be dismissed but never snoozed, even if a snooze action is present', () => {
    const h = handlers();
    render(<ul><InboxSummaryRow item={summary} highlighted={false} {...h} /></ul>);
    expect(screen.queryByRole('button', { name: /Snooze/ })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Dismiss Transactions to review' }));
    expect(h.onDismiss).toHaveBeenCalledWith(summary);
  });

  it('hides the badge for a missing or zero count', () => {
    const { rerender } = render(<ul><InboxSummaryRow item={{ ...summary, count: 0 }} highlighted={false} {...handlers()} /></ul>);
    expect(screen.queryByText('0')).not.toBeInTheDocument();
    rerender(<ul><InboxSummaryRow item={{ ...summary, count: null }} highlighted={false} {...handlers()} /></ul>);
    expect(screen.queryByText('42')).not.toBeInTheDocument();
  });

  it('highlight adds the ring', () => {
    const { container } = render(<ul><InboxSummaryRow item={summary} highlighted {...handlers()} /></ul>);
    expect(container.querySelector('.ring-emerald-500\\/40')).not.toBeNull();
  });

  it('a summary row uses a plain row (no swipe wrapper)', () => {
    render(<ul><InboxSummaryRow item={summary} highlighted={false} {...handlers()} /></ul>);
    expect(document.querySelector('[data-slot="swipe-action-row-content"]')).toBeNull();
  });
});

describe('InboxRowControls', () => {
  it('renders nothing when there is neither snooze nor dismiss', () => {
    const { container } = render(<InboxRowControls item={item({ key: 'k' })} onSnooze={vi.fn()} onDismiss={vi.fn()} />);
    expect(container).toBeEmptyDOMElement();
  });
});

describe('InboxSection', () => {
  it('shows the title with a count and picks the row component by rowType', () => {
    const items = [
      item({ key: 'i1', title: 'Item one' }),
      item({ key: 's1', rowType: 'summary', title: 'Summary one', count: 3 }),
    ];
    render(<InboxSection sectionKey="act_now" title="Act now" items={items} highlightKey="s1" {...handlers()} />);
    const section = screen.getByTestId('inbox-section-act_now');
    expect(within(section).getByRole('heading', { name: /Act now/ })).toHaveTextContent('Act now (2)');
    expect(within(section).getAllByTestId('inbox-item-row')).toHaveLength(1);
    expect(within(section).getAllByTestId('inbox-summary-row')).toHaveLength(1);
    expect(section.querySelectorAll('.ring-emerald-500\\/40')).toHaveLength(1);
    expect(screen.getByTestId('inbox-summary-row').innerHTML).toContain('ring-emerald');
  });
});

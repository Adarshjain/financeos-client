import { act, fireEvent, render, screen } from '@testing-library/react';
import React, { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Tabs } from './Tabs';


function mockLayout(positions: Record<string, [number, number]>) {
  const label = (el: HTMLElement) => (el.textContent ?? '').trim();
  const left = vi
    .spyOn(HTMLElement.prototype, 'offsetLeft', 'get')
    .mockImplementation(function (this: HTMLElement) {
      return positions[label(this)]?.[0] ?? 0;
    });
  const width = vi
    .spyOn(HTMLElement.prototype, 'offsetWidth', 'get')
    .mockImplementation(function (this: HTMLElement) {
      return positions[label(this)]?.[1] ?? 0;
    });
  return () => {
    left.mockRestore();
    width.mockRestore();
  };
}

describe('Tabs', () => {
  it('renders tablist and tabs from items', () => {
    render(
      <Tabs
        defaultValue="rules"
        items={[
          { value: 'all', label: 'All' },
          { value: 'rules', label: 'Rules' },
          { value: 'categories', label: 'Categories' },
        ]}
      />,
    );
    expect(screen.getByRole('tablist')).toBeInTheDocument();
    const rulesTab = screen.getByRole('tab', { name: 'Rules' });
    expect(rulesTab).toBeInTheDocument();
    expect(rulesTab).toHaveAttribute('aria-selected', 'true');

    const allTab = screen.getByRole('tab', { name: 'All' });
    expect(allTab).toHaveAttribute('aria-selected', 'false');
  });

  it('changes tab on click and calls onValueChange', () => {
    const handleValueChange = vi.fn();
    render(
      <Tabs
        defaultValue="all"
        onValueChange={handleValueChange}
        items={[
          { value: 'all', label: 'All' },
          { value: 'rules', label: 'Rules' },
        ]}
      />,
    );
    const rulesTab = screen.getByRole('tab', { name: 'Rules' });
    fireEvent.mouseDown(rulesTab, { button: 0 });

    expect(rulesTab).toHaveAttribute('aria-selected', 'true');
    expect(handleValueChange).toHaveBeenCalledWith('rules');
  });

  it('works in controlled mode', () => {
    const ControlledTabs = () => {
      const [val, setVal] = useState('one');
      return (
        <Tabs
          value={val}
          onValueChange={setVal}
          items={[
            { value: 'one', label: 'One' },
            { value: 'two', label: 'Two' },
          ]}
        />
      );
    };

    render(<ControlledTabs />);
    const twoTab = screen.getByRole('tab', { name: 'Two' });
    expect(twoTab).toHaveAttribute('aria-selected', 'false');

    fireEvent.mouseDown(twoTab, { button: 0 });
    expect(twoTab).toHaveAttribute('aria-selected', 'true');
  });

  it('renders tab counts without opacity-75 and with inset focus ring', () => {
    render(
      <Tabs
        items={[
          { value: 'tradebook', label: 'Tradebook', count: 38 },
        ]}
      />,
    );
    const tab = screen.getByRole('tab', { name: /Tradebook/ });
    expect(tab).toHaveClass('focus-visible:ring-inset');
    const countSpan = screen.getByText(/38/);
    expect(countSpan).toBeInTheDocument();
    expect(countSpan).not.toHaveClass('opacity-75');
  });

  it('navigates with arrow keys and Home/End', async () => {
    render(
      <Tabs
        defaultValue="first"
        items={[
          { value: 'first', label: 'First' },
          { value: 'second', label: 'Second' },
          { value: 'third', label: 'Third' },
        ]}
      />,
    );
    const firstTab = screen.getByRole('tab', { name: 'First' });
    firstTab.focus();

    fireEvent.keyDown(firstTab, { key: 'ArrowRight' });
    await vi.waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Second' })).toHaveAttribute(
        'aria-selected',
        'true',
      );
    });

    const secondTab = screen.getByRole('tab', { name: 'Second' });
    secondTab.focus();
    fireEvent.keyDown(secondTab, { key: 'End' });
    await vi.waitFor(() => {
      expect(screen.getByRole('tab', { name: 'Third' })).toHaveAttribute(
        'aria-selected',
        'true',
      );
    });

    const thirdTab = screen.getByRole('tab', { name: 'Third' });
    thirdTab.focus();
    fireEvent.keyDown(thirdTab, { key: 'Home' });
    await vi.waitFor(() => {
      expect(screen.getByRole('tab', { name: 'First' })).toHaveAttribute(
        'aria-selected',
        'true',
      );
    });
  });

  it('renders TabsContent matching the active tab', () => {
    render(
      <Tabs defaultValue="tab1">
        <Tabs.List>
          <Tabs.Trigger value="tab1">Tab 1</Tabs.Trigger>
          <Tabs.Trigger value="tab2">Tab 2</Tabs.Trigger>
        </Tabs.List>
        <Tabs.Content value="tab1">Content 1</Tabs.Content>
        <Tabs.Content value="tab2">Content 2</Tabs.Content>
      </Tabs>,
    );
    expect(screen.getByText('Content 1')).toBeInTheDocument();
    expect(screen.queryByText('Content 2')).not.toBeInTheDocument();

    const tab2 = screen.getByRole('tab', { name: 'Tab 2' });
    fireEvent.mouseDown(tab2, { button: 0 });
    expect(screen.queryByText('Content 1')).not.toBeInTheDocument();
    expect(screen.getByText('Content 2')).toBeInTheDocument();
  });

  it('prevents interaction on disabled tab', () => {
    const handleValueChange = vi.fn();
    render(
      <Tabs
        defaultValue="active"
        onValueChange={handleValueChange}
        items={[
          { value: 'active', label: 'Active' },
          { value: 'disabled', label: 'Disabled', disabled: true },
        ]}
      />,
    );
    const disabledTab = screen.getByRole('tab', { name: 'Disabled' });
    expect(disabledTab).toBeDisabled();

    fireEvent.click(disabledTab);
    expect(handleValueChange).not.toHaveBeenCalled();
  });

  it('renders tab trigger with square underline (rounded-none, no rounded-ds-sm)', () => {
    render(
      <Tabs
        defaultValue="first"
        items={[{ value: 'first', label: 'First' }]}
      />,
    );
    const tab = screen.getByRole('tab', { name: 'First' });
    expect(tab).toHaveClass('rounded-none');
    expect(tab).not.toHaveClass('rounded-ds-sm');
  });

  it('prevents vertical scroll on tablist with overflow-y-hidden', () => {
    render(
      <Tabs
        defaultValue="first"
        items={[{ value: 'first', label: 'First' }]}
      />,
    );
    const tablist = screen.getByRole('tablist');
    expect(tablist).toHaveClass('overflow-x-auto');
    expect(tablist).toHaveClass('overflow-y-hidden');
  });
  describe('route tabs (link items)', () => {
    /** Stands in for the app's next/link Link. */
    const Link = (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props} />;
    const routeItems = (counts: { statements?: number; cards?: number } = {}) => [
      { value: 'overview', label: 'Overview', asChild: true, children: <Link href="/accounts/7" /> },
      { value: 'statements', label: 'Statements', count: counts.statements, asChild: true, children: <Link href="/accounts/7/statements" /> },
      { value: 'cards', label: 'Cards', count: counts.cards, asChild: true, children: <Link href="/accounts/7/cards" /> },
    ];

    it('renders each tab as its link, with the label and count inside', () => {
      render(<Tabs value="statements" items={routeItems({ statements: 3 })} />);
      const tab = screen.getByRole('tab', { name: /Statements\s*·\s*3/ });
      expect(tab.tagName).toBe('A');
      expect(tab).toHaveAttribute('href', '/accounts/7/statements');
      expect(tab).toHaveAttribute('aria-selected', 'true');
      expect(tab).toHaveClass('no-underline', 'data-active:border-brand');
      expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute('aria-selected', 'false');
    });

    it('shows a tab without its count while the count loads, and adds it when it arrives', () => {
      const { rerender } = render(<Tabs value="overview" items={routeItems()} />);
      expect(screen.getByRole('tab', { name: 'Statements' })).toBeInTheDocument();
      expect(screen.queryByText(/·/)).toBeNull();

      rerender(<Tabs value="overview" items={routeItems({ statements: 3, cards: 2 })} />);
      expect(screen.getByRole('tab', { name: /Statements\s*·\s*3/ })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: /Cards\s*·\s*2/ })).toBeInTheDocument();
    });

    it('reports the clicked tab through onValueChange', () => {
      const onValueChange = vi.fn();
      render(<Tabs value="overview" onValueChange={onValueChange} items={routeItems()} />);
      fireEvent.mouseDown(screen.getByRole('tab', { name: 'Cards' }), { button: 0 });
      expect(onValueChange).toHaveBeenCalledWith('cards');
    });

    it('moves focus with arrow keys without selecting a tab whose page is not open', async () => {
      const onValueChange = vi.fn();
      render(<Tabs value="overview" onValueChange={onValueChange} items={routeItems()} />);
      const overview = screen.getByRole('tab', { name: 'Overview' });
      overview.focus();
      fireEvent.keyDown(overview, { key: 'ArrowRight' });
      await vi.waitFor(() => expect(screen.getByRole('tab', { name: 'Statements' })).toHaveFocus());
      expect(onValueChange).not.toHaveBeenCalled();
      expect(overview).toHaveAttribute('aria-selected', 'true');
    });

    it('lets the page choose the activation mode', async () => {
      const onValueChange = vi.fn();
      render(
        <Tabs value="overview" activationMode="automatic" onValueChange={onValueChange} items={routeItems()} />,
      );
      const overview = screen.getByRole('tab', { name: 'Overview' });
      overview.focus();
      fireEvent.keyDown(overview, { key: 'ArrowRight' });
      await vi.waitFor(() => expect(onValueChange).toHaveBeenCalledWith('statements'));
    });

    it('does not follow a disabled link tab', () => {
      const onValueChange = vi.fn();
      render(
        <Tabs
          value="overview"
          onValueChange={onValueChange}
          items={[
            { value: 'overview', label: 'Overview', asChild: true, children: <Link href="/a" /> },
            { value: 'rewards', label: 'Rewards', disabled: true, asChild: true, children: <Link href="/b" /> },
          ]}
        />,
      );
      const rewards = screen.getByRole('tab', { name: 'Rewards' });
      fireEvent.mouseDown(rewards, { button: 0 });
      const click = new MouseEvent('click', { bubbles: true, cancelable: true });
      rewards.dispatchEvent(click);
      expect(click.defaultPrevented).toBe(true);
      expect(onValueChange).not.toHaveBeenCalled();
    });

    it('keeps button tabs selecting on arrow keys when no item is a link', async () => {
      const onValueChange = vi.fn();
      render(
        <Tabs
          value="a"
          onValueChange={onValueChange}
          items={[
            { value: 'a', label: 'A' },
            { value: 'b', label: 'B' },
          ]}
        />,
      );
      const a = screen.getByRole('tab', { name: 'A' });
      expect(a.tagName).toBe('BUTTON');
      a.focus();
      fireEvent.keyDown(a, { key: 'ArrowRight' });
      await vi.waitFor(() => expect(onValueChange).toHaveBeenCalledWith('b'));
    });

    it('accepts a link child on TabsTrigger directly', () => {
      render(
        <Tabs value="statements">
          <Tabs.List>
            <Tabs.Trigger value="statements" count={3} asChild>
              <Link href="/s">Statements</Link>
            </Tabs.Trigger>
          </Tabs.List>
        </Tabs>,
      );
      const tab = screen.getByRole('tab', { name: /Statements\s*·\s*3/ });
      expect(tab.tagName).toBe('A');
      expect(tab).toHaveAttribute('href', '/s');
    });
  });

  describe('sliding indicator', () => {
    const items = [
      { value: 'a', label: 'Alpha' },
      { value: 'b', label: 'Beta' },
    ];
    const positions: Record<string, [number, number]> = { Alpha: [0, 60], Beta: [64, 50] };

    it('follows the active tab and hands the underline over to the indicator', () => {
      const restore = mockLayout(positions);
      const { container, rerender } = render(<Tabs value="a" items={items} />);
      const indicator = () => container.querySelector<HTMLElement>('[data-tabs-indicator]');
      expect(indicator()?.style.width).toBe('60px');
      expect(indicator()?.style.transform).toBe('translateX(0px)');
      expect(screen.getByRole('tab', { name: 'Alpha' }).className).toContain('data-active:border-transparent');
      rerender(<Tabs value="b" items={items} />);
      expect(indicator()?.style.width).toBe('50px');
      expect(indicator()?.style.transform).toBe('translateX(64px)');
      restore();
    });

    it('slides when the active tab changes but snaps when the same tab is resized', () => {
      const callbacks: Array<() => void> = [];
      const original = globalThis.ResizeObserver;
      globalThis.ResizeObserver = class {
        constructor(cb: () => void) {
          callbacks.push(cb);
        }
        observe() {}
        unobserve() {}
        disconnect() {}
      } as unknown as typeof ResizeObserver;
      const pos: Record<string, [number, number]> = { Alpha: [0, 60], Beta: [64, 50] };
      const restore = mockLayout(pos);
      const { container, rerender } = render(<Tabs value="a" items={items} />);
      const indicator = () => container.querySelector<HTMLElement>('[data-tabs-indicator]')!;
      expect(indicator().className).not.toContain('transition-all');
      rerender(<Tabs value="b" items={items} />);
      expect(indicator().className).toContain('transition-all');
      pos.Beta = [64, 80];
      act(() => callbacks.forEach((cb) => cb()));
      expect(indicator().style.width).toBe('80px');
      expect(indicator().className).not.toContain('transition-all');
      restore();
      globalThis.ResizeObserver = original;
    });

    it('works without ResizeObserver', () => {
      const original = globalThis.ResizeObserver;
      // @ts-expect-error simulate an environment without ResizeObserver
      delete globalThis.ResizeObserver;
      expect(() => render(<Tabs defaultValue="a" items={items} />)).not.toThrow();
      globalThis.ResizeObserver = original;
    });
  });
});

import { fireEvent, render, screen } from '@testing-library/react';
import React, { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Tabs, TabsContent, TabsList, TabsTrigger } from './Tabs';

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
        <TabsList>
          <TabsTrigger value="tab1">Tab 1</TabsTrigger>
          <TabsTrigger value="tab2">Tab 2</TabsTrigger>
        </TabsList>
        <TabsContent value="tab1">Content 1</TabsContent>
        <TabsContent value="tab2">Content 2</TabsContent>
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
});


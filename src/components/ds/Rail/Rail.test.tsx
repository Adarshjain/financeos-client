import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Rail, type RailGroup } from './Rail';

const sampleGroups: RailGroup[] = [
  {
    items: [
      { id: 'home', label: 'Home', icon: 'home' },
      { id: 'inbox', label: 'Inbox', icon: 'inbox', count: 9, countTone: 'danger' },
    ],
  },
  {
    label: 'Money',
    items: [
      { id: 'transactions', label: 'Transactions', icon: 'list-bullets', count: 25, countTone: 'warning' },
    ],
  },
];

describe('Rail component', () => {
  it('renders brand slot and nav items from groups prop', () => {
    render(
      <Rail
        value="home"
        brand={<span>Brand Logo</span>}
        groups={sampleGroups}
      />,
    );
    expect(screen.getByText('Brand Logo')).toBeInTheDocument();
    expect(screen.getByText('Home')).toBeInTheDocument();
    expect(screen.getByText('Inbox')).toBeInTheDocument();
    expect(screen.getByText('Money')).toBeInTheDocument();
    expect(screen.getByText('Transactions')).toBeInTheDocument();
  });

  it('marks current nav item matching value with brand-tint, brand-strong, and aria-current="page"', () => {
    render(<Rail value="transactions" groups={sampleGroups} />);
    const activeItem = screen.getByText('Transactions').closest('button');
    expect(activeItem).toHaveClass('bg-brand-tint');
    expect(activeItem).toHaveClass('text-brand-strong');
    expect(activeItem).toHaveAttribute('aria-current', 'page');

    const inactiveItem = screen.getByText('Home').closest('button');
    expect(inactiveItem).not.toHaveClass('bg-brand-tint');
    expect(inactiveItem).not.toHaveAttribute('aria-current');
  });

  it('fires onSelect and onValueChange when an item is clicked', () => {
    const handleSelect = vi.fn();
    const handleValueChange = vi.fn();
    render(
      <Rail
        value="home"
        groups={sampleGroups}
        onSelect={handleSelect}
        onValueChange={handleValueChange}
      />,
    );
    const inboxItem = screen.getByText('Inbox').closest('button');
    fireEvent.click(inboxItem!);
    expect(handleSelect).toHaveBeenCalledWith('inbox');
    expect(handleValueChange).toHaveBeenCalledWith('inbox');
  });

  it('renders search slot', () => {
    render(
      <Rail
        search={<button type="button">Custom Search</button>}
      />,
    );
    expect(screen.getByRole('button', { name: 'Custom Search' })).toBeInTheDocument();
  });

  it('renders count badges for danger and warning tones', () => {
    render(<Rail value="home" groups={sampleGroups} />);
    expect(screen.getByText('9')).toBeInTheDocument();
    const warningBadge = screen.getByText('25');
    expect(warningBadge).toBeInTheDocument();
    expect(warningBadge).toHaveClass('bg-warning', 'text-on-brand');
  });

  it('renders footer slot', () => {
    render(
      <Rail
        value="home"
        footer={<div data-testid="custom-footer">Footer Content</div>}
      />,
    );
    expect(screen.getByTestId('custom-footer')).toBeInTheDocument();
    expect(screen.getByText('Footer Content')).toBeInTheDocument();
  });

  it('supports asChild rendering around custom links', () => {
    const asChildGroups: RailGroup[] = [
      {
        items: [
          {
            id: 'link-item',
            label: 'Link Item',
            asChild: true,
            children: <a href="/custom-path">Link Item</a>,
          },
        ],
      },
    ];

    render(<Rail value="link-item" groups={asChildGroups} />);
    const link = screen.getByText('Link Item').closest('a');
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '/custom-path');
    expect(link).toHaveAttribute('aria-current', 'page');
  });

  it('works uncontrolled with defaultValue', () => {
    render(<Rail defaultValue="home" groups={sampleGroups} />);
    const homeBtn = screen.getByText('Home').closest('button');
    expect(homeBtn).toHaveAttribute('aria-current', 'page');

    const inboxBtn = screen.getByText('Inbox').closest('button');
    fireEvent.click(inboxBtn!);
    expect(inboxBtn).toHaveAttribute('aria-current', 'page');
    expect(homeBtn).not.toHaveAttribute('aria-current');
  });
  describe('collapsible', () => {
    it('renders as today without a toggle when not collapsible', () => {
      render(<Rail groups={sampleGroups} brand={<span>Brand Logo</span>} collapsed />);
      expect(screen.queryByRole('button', { name: /sidebar/i })).not.toBeInTheDocument();
      expect(screen.getByText('Home')).toBeInTheDocument();
      expect(screen.getByRole('navigation')).toHaveClass('w-container-xs');
    });

    it('shows the toggle beside the brand, and collapsing hides labels, brand and group labels', () => {
      const onCollapsedChange = vi.fn();
      render(
        <Rail
          collapsible
          groups={sampleGroups}
          brand={<span>Brand Logo</span>}
          onCollapsedChange={onCollapsedChange}
        />,
      );
      const toggle = screen.getByRole('button', { name: 'Collapse sidebar' });
      expect(toggle).toHaveAttribute('aria-expanded', 'true');
      expect(screen.getByText('Brand Logo')).toBeInTheDocument();
      fireEvent.click(toggle);
      expect(onCollapsedChange).toHaveBeenCalledWith(true);
      const expand = screen.getByRole('button', { name: 'Expand sidebar' });
      expect(expand).toHaveAttribute('aria-expanded', 'false');
      expect(screen.queryByText('Brand Logo')).not.toBeInTheDocument();
      expect(screen.queryByText('Money')).not.toBeInTheDocument();
      expect(screen.queryByText('Home')).not.toBeInTheDocument();
      expect(screen.getByRole('navigation')).toHaveClass('w-space-64');
    });

    it('collapsed items keep an aria-label and a count badge', () => {
      render(<Rail collapsible defaultCollapsed groups={sampleGroups} value="home" />);
      const inbox = screen.getByRole('button', { name: 'Inbox' });
      expect(inbox).toHaveTextContent('9');
      expect(screen.getByRole('button', { name: 'Home' })).toHaveAttribute('aria-current', 'page');
    });

    it('is controllable through collapsed', () => {
      const { rerender } = render(<Rail collapsible collapsed={false} groups={sampleGroups} />);
      expect(screen.getByText('Home')).toBeInTheDocument();
      rerender(<Rail collapsible collapsed groups={sampleGroups} />);
      expect(screen.queryByText('Home')).not.toBeInTheDocument();
    });
  });
});

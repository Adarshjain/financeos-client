import { fireEvent, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Button } from '../Button/Button';
import { ListField, ListRow } from './ListRow';

describe('ListRow', () => {
  it('renders title and subtitle with correct typography', () => {
    render(<ListRow title="Amex Platinum bill" subtitle="Card bill" />);
    const titleEl = screen.getByText('Amex Platinum bill');
    expect(titleEl).toBeInTheDocument();
    expect(titleEl).toHaveClass('text-body-strong');
    const subtitleEl = screen.getByText('Card bill');
    expect(subtitleEl).toBeInTheDocument();
    expect(subtitleEl).toHaveClass('text-label');
  });

  it('renders leading and trailing elements', () => {
    render(
      <ListRow
        leading={<span data-testid="leading-badge">Missing</span>}
        title="SBI Statement"
        trailing={<span data-testid="trailing-amount">₹33,900</span>}
      />,
    );
    expect(screen.getByTestId('leading-badge')).toBeInTheDocument();
    expect(screen.getByTestId('trailing-amount')).toBeInTheDocument();
  });

  it('renders trailing node as passed by the app', () => {
    render(
      <ListRow
        title="Rahul Sharma"
        trailing={<span className="text-positive tabular-nums">+₹15,000</span>}
      />,
    );
    const amountEl = screen.getByText('+₹15,000');
    expect(amountEl).toBeInTheDocument();
    expect(amountEl).toHaveClass('text-positive', 'tabular-nums');
  });

  it('applies highlighted styling: brand-tint ground, no dark stripe', () => {
    const { container: c1 } = render(<ListRow title="Row 1" highlighted />);
    expect(c1.firstChild).toHaveClass('border-l-4', 'border-l-transparent', 'bg-brand-tint');
    expect(c1.firstChild).not.toHaveClass('border-l-brand-strong');
  });

  it('applies disabled styling and aria-disabled attribute', () => {
    const handleClick = vi.fn();
    const { container } = render(
      <ListRow title="Closed Account" disabled onClick={handleClick} />,
    );
    expect(container.firstChild).toHaveClass('opacity-50', 'pointer-events-none');
    expect(container.firstChild).toHaveAttribute('aria-disabled', 'true');

    fireEvent.click(container.firstChild as HTMLElement);
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('handles click events and keyboard triggers when interactive', () => {
    const handleClick = vi.fn();
    render(
      <ListRow title="Interactive Row" onClick={handleClick} />,
    );
    const row = screen.getByRole('button');
    expect(row).toBeInTheDocument();

    fireEvent.click(row);
    expect(handleClick).toHaveBeenCalledTimes(1);

    fireEvent.keyDown(row, { key: 'Enter' });
    expect(handleClick).toHaveBeenCalledTimes(2);

    fireEvent.keyDown(row, { key: ' ' });
    expect(handleClick).toHaveBeenCalledTimes(3);
  });

  it('renders actions menu button and triggers onSelect when action is clicked', async () => {
    const handleSelect = vi.fn();
    render(
      <ListRow
        title="Dining out"
        actions={[
          { id: 'edit', label: 'Edit', onSelect: handleSelect },
        ]}
      />,
    );
    const kebabBtn = screen.getByRole('button', { name: 'More options' });
    expect(kebabBtn).toBeInTheDocument();

    fireEvent.pointerDown(kebabBtn, { button: 0 });
    const item = await screen.findByRole('menuitem', { name: 'Edit' });
    expect(item).toBeInTheDocument();
    fireEvent.click(item);
    expect(handleSelect).toHaveBeenCalledTimes(1);
  });

  it('renders chevron icon when chevron prop is true', () => {
    const { container } = render(<ListRow title="Navigate" chevron />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass('w-icon-sm', 'h-icon-sm');
  });

  it('renders asChild using Radix Slot without underline and with inherited text color', () => {
    render(
      <ListRow asChild title="Sign in" subtitle="Account access" chevron>
        <a href="#" data-testid="nav-link" />
      </ListRow>,
    );

    const link = screen.getByTestId('nav-link');
    expect(link.tagName).toBe('A');
    expect(link).toHaveAttribute('href', '#');
    expect(link).toHaveClass('no-underline', 'text-inherit', 'cursor-pointer');
    expect(screen.getByText('Sign in')).toBeInTheDocument();
    expect(screen.getByText('Account access')).toBeInTheDocument();
    expect(link.querySelector('svg')).toBeInTheDocument();
  });

  it('skips key interceptor when asChild is true', () => {
    const handleClick = vi.fn();
    render(
      <ListRow asChild title="Profile" onClick={handleClick}>
        <a href="#" data-testid="as-child-link">Link</a>
      </ListRow>,
    );
    const link = screen.getByTestId('as-child-link');
    fireEvent.keyDown(link, { key: 'Enter' });
    // In asChild mode, ListRow does not call onClick on Enter
    expect(handleClick).not.toHaveBeenCalled();
  });

  it('forwards ref to child element when asChild is used', () => {
    const ref = React.createRef<HTMLAnchorElement>();
    render(
      <ListRow asChild ref={ref as React.Ref<HTMLDivElement>}>
        <a href="#">Offline</a>
      </ListRow>,
    );
    expect(ref.current).toBeInstanceOf(HTMLAnchorElement);
  });

  it('uses active-self:bg-pressed and no bare active:bg- on interactive rows', () => {
    const { container } = render(
      <ListRow
        clickable
        title="Settings"
        trailing={<Button variant="ghost">Action</Button>}
      />,
    );
    const row = container.firstChild as HTMLElement;
    expect(row.className).toContain('active-self:bg-pressed');
    expect(row.className).not.toMatch(/\bactive:bg-/);
  });
});

describe('ListField', () => {
  it('renders label and value with font-semibold value weight', () => {
    render(<ListField label="Account" value="HDFC Regalia ••7741" />);
    expect(screen.getByText('Account')).toBeInTheDocument();
    const valueEl = screen.getByText('HDFC Regalia ••7741');
    expect(valueEl).toBeInTheDocument();
    expect(valueEl).toHaveClass('font-semibold');
  });

  describe('flush', () => {
    it('keeps the side gutter and left rail by default', () => {
      render(<ListRow title="Row" />);
      const row = screen.getByText('Row').closest('div[class*="px-"]') as HTMLElement;
      expect(row).toHaveClass('px-space-16', 'border-l-4');
    });

    it('drops the gutter and rail when flush is set', () => {
      render(<ListRow flush title="Row" />);
      const row = screen.getByText('Row').closest('div[class*="px-"]') as HTMLElement;
      expect(row).toHaveClass('px-0', 'border-l-0');
      expect(row).not.toHaveClass('px-space-16');
    });
  });

  describe('wrap', () => {
    it('truncates title and subtitle by default', () => {
      render(<ListRow title="Send at" subtitle="A long line" />);
      expect(screen.getByText('Send at')).toHaveClass('truncate');
      expect(screen.getByText('A long line')).toHaveClass('truncate');
    });

    it('wraps title and subtitle when wrap is set', () => {
      render(<ListRow wrap title="Send at" subtitle="A long line" />);
      for (const el of [screen.getByText('Send at'), screen.getByText('A long line')]) {
        expect(el).toHaveClass('break-words');
        expect(el).not.toHaveClass('truncate');
        expect(el.parentElement).toHaveClass('min-w-0');
      }
    });

    it('wraps in the asChild branch too and keeps trailing centred', () => {
      render(
        <ListRow asChild wrap title="Profile" subtitle="Long text" trailing={<span data-testid="t">x</span>}>
          <a href="#" data-testid="row" />
        </ListRow>,
      );
      expect(screen.getByText('Profile')).toHaveClass('break-words');
      expect(screen.getByText('Long text')).not.toHaveClass('truncate');
      expect(screen.getByTestId('row')).toHaveClass('items-center');
      expect(screen.getByTestId('t').parentElement).toHaveClass('shrink-0', 'items-center');
    });
  });

  it('renders asChild when the child arrives as a resolved React lazy reference (server page streaming)', () => {
    const lazyChild = {
      $$typeof: Symbol.for('react.lazy'),
      _payload: { status: 'fulfilled', value: <a href="#" data-testid="lazy-link" /> },
      _init: (payload: { value: React.ReactNode }) => payload.value,
    } as unknown as React.ReactNode;
    render(
      <ListRow asChild title="Offline" subtitle="/offline">
        {lazyChild}
      </ListRow>,
    );
    const link = screen.getByTestId('lazy-link');
    expect(link.tagName).toBe('A');
    expect(link).toHaveTextContent('Offline');
  });
});

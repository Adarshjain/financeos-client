import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import {
  Card,
} from './Card';

describe('Card', () => {
  it('renders title, subtitle, and action when passed as props', () => {
    render(
      <Card
        title="Needs you"
        subtitle="Act now · 2"
        action={<button type="button">Inbox</button>}
      />,
    );
    expect(screen.getByText('Needs you')).toBeInTheDocument();
    expect(screen.getByText('Act now · 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Inbox' })).toBeInTheDocument();
  });

  it('renders compound header structure', () => {
    render(
      <Card>
        <Card.Header>
          <div>
            <Card.Title>Statements</Card.Title>
            <Card.Subtitle>Each statement is a bill</Card.Subtitle>
          </div>
        </Card.Header>
      </Card>,
    );
    expect(screen.getByText('Statements')).toBeInTheDocument();
    expect(screen.getByText('Each statement is a bill')).toBeInTheDocument();
  });

  it('Card.Title and Card.Subtitle support as and truncate props', () => {
    render(
      <Card>
        <Card.Header>
          <div>
            <Card.Title as="h2" truncate={false}>Needs you</Card.Title>
            <Card.Subtitle as="span" truncate={false}>Action required</Card.Subtitle>
          </div>
        </Card.Header>
      </Card>,
    );
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toHaveTextContent('Needs you');
    expect(heading).not.toHaveClass('truncate');
    const subtitle = screen.getByText('Action required');
    expect(subtitle.tagName.toLowerCase()).toBe('span');
    expect(subtitle).not.toHaveClass('truncate');
  });

  it('renders rows with children', () => {
    render(
      <Card title="Upcoming">
        <Card.Row>
          <span>Amex bill</span>
          <span>₹33,900</span>
        </Card.Row>
        <Card.Row>
          <span>Rent</span>
          <span>₹25,000</span>
        </Card.Row>
      </Card>,
    );
    expect(screen.getByText('Amex bill')).toBeInTheDocument();
    expect(screen.getByText('Rent')).toBeInTheDocument();
  });

  it('renders section bands inside card', () => {
    render(
      <Card>
        <Card.Section>Act now · 2</Card.Section>
        <Card.Row>Item 1</Card.Row>
      </Card>,
    );
    expect(screen.getByText('Act now · 2')).toBeInTheDocument();
    expect(screen.getByText('Item 1')).toBeInTheDocument();
  });

  it('renders empty state without extra top border divider', () => {
    const { container } = render(
      <Card title="Untagged · 0">
        <Card.Empty>Every transaction has a category.</Card.Empty>
      </Card>,
    );
    const emptyEl = screen.getByText('Every transaction has a category.');
    expect(emptyEl).toBeInTheDocument();
    expect(container.querySelector('.font-text.text-body.text-ink-3')).not.toHaveClass('border-t');
  });

  it('renders footer with px-space-16 padding', () => {
    const { container } = render(
      <Card title="List">
        <Card.Footer>
          <span>Pagination info</span>
        </Card.Footer>
      </Card>,
    );
    expect(screen.getByText('Pagination info')).toBeInTheDocument();
    expect(container.querySelector('.border-t')).toHaveClass('px-space-16');
  });

  it('renders as custom element with asChild', () => {
    render(
      <Card asChild>
        <a href="#account-link">Account Link</a>
      </Card>,
    );
    const link = screen.getByRole('link', { name: 'Account Link' });
    expect(link).toBeInTheDocument();
    expect(link).toHaveAttribute('href', '#account-link');
    expect(link).toHaveClass('bg-surface', 'border', 'border-line', 'rounded-ds-lg');
  });

  it('does not force w-full class on root', () => {
    const { container } = render(<Card>Card content</Card>);
    expect(container.firstChild).not.toHaveClass('w-full');
    expect(container.firstChild).toHaveClass('overflow-clip', 'min-w-0');
  });
});

describe('Card inset variant', () => {
  it('keeps the default variant unchanged', () => {
    render(<Card data-testid="c" title="Default" />);
    const c = screen.getByTestId('c');
    expect(c).toHaveClass('rounded-ds-lg', 'border-line', 'bg-surface');
    expect(c).not.toHaveClass('rounded-ds-md');
  });

  it('draws an inset with surface, hairline border, md radius and no shadow', () => {
    render(<Card variant="inset" data-testid="c" />);
    const c = screen.getByTestId('c');
    expect(c).toHaveClass('bg-surface', 'border', 'border-line', 'rounded-ds-md');
    expect(c).not.toHaveClass('rounded-ds-lg');
    expect(c.className).not.toMatch(/shadow/);
  });

  it('tightens header and row padding inside an inset', () => {
    render(
      <Card variant="inset" title="Job" data-testid="c">
        <Card.Row>Row</Card.Row>
      </Card>,
    );
    expect(screen.getByText('Job').closest('div.flex')).toHaveClass('px-space-10');
    expect(screen.getByText('Row')).toHaveClass('px-space-10', 'py-space-8');
  });

  it('keeps normal padding for a default card', () => {
    render(<Card><Card.Row>Row</Card.Row></Card>);
    expect(screen.getByText('Row')).toHaveClass('px-space-16');
  });

  it('nests an inset inside an inset', () => {
    render(
      <Card variant="inset" data-testid="outer">
        <Card variant="inset" data-testid="inner">
          <Card.Row>Deep</Card.Row>
        </Card>
      </Card>,
    );
    expect(screen.getByTestId('outer')).toContainElement(screen.getByTestId('inner'));
    expect(screen.getByTestId('inner')).toHaveClass('rounded-ds-md', 'border-line');
    expect(screen.getByText('Deep')).toHaveClass('px-space-10');
  });

  it('forwards ref and className on an inset', () => {
    const ref = React.createRef<HTMLDivElement>();
    render(<Card variant="inset" ref={ref} className="mt-space-8" data-testid="c" />);
    expect(ref.current).toBe(screen.getByTestId('c'));
    expect(ref.current).toHaveClass('mt-space-8');
  });

  describe('tone', () => {
    it('is neutral by default', () => {
      render(<Card data-testid="c" />);
      expect(screen.getByTestId('c')).toHaveClass('border-line');
      expect(screen.getByTestId('c')).not.toHaveClass('border-danger-border');
    });

    it('danger swaps only the border colour', () => {
      render(<Card tone="danger" data-testid="c" />);
      const el = screen.getByTestId('c');
      expect(el).toHaveClass('border', 'border-danger-border', 'rounded-ds-lg', 'bg-surface');
      expect(el).not.toHaveClass('border-line');
    });

    it('danger works with the inset variant and leaves rows unchanged', () => {
      render(
        <Card tone="danger" variant="inset" data-testid="c">
          <Card.Row>Row</Card.Row>
        </Card>,
      );
      expect(screen.getByTestId('c')).toHaveClass('border-danger-border', 'rounded-ds-md');
      expect(screen.getByText('Row')).toHaveClass('border-line-soft', 'px-space-10');
    });
  });

  describe('selected', () => {
    it('applies the brand ring when selected', () => {
      render(<Card selected data-testid="c" />);
      expect(screen.getByTestId('c')).toHaveClass('ring-2', 'ring-brand');
    });

    it('has no ring by default or when false', () => {
      render(
        <>
          <Card data-testid="a" />
          <Card selected={false} data-testid="b" />
        </>,
      );
      expect(screen.getByTestId('a')).not.toHaveClass('ring-2', 'ring-brand');
      expect(screen.getByTestId('b')).not.toHaveClass('ring-2', 'ring-brand');
    });

    it('works with asChild on a button and keeps hover and pressed states', () => {
      render(
        <Card asChild selected>
          <button type="button">Keep this one</button>
        </Card>,
      );
      const btn = screen.getByRole('button', { name: 'Keep this one' });
      expect(btn).toHaveClass('ring-2', 'ring-brand', 'hover:bg-hover', 'active:bg-pressed');
    });
  });
});

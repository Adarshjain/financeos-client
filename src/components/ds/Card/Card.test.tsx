import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import {
  Card,
  CardEmpty,
  CardFooter,
  CardHeader,
  CardRow,
  CardSection,
  CardSubtitle,
  CardTitle,
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
        <CardHeader>
          <div>
            <CardTitle>Statements</CardTitle>
            <CardSubtitle>Each statement is a bill</CardSubtitle>
          </div>
        </CardHeader>
      </Card>,
    );
    expect(screen.getByText('Statements')).toBeInTheDocument();
    expect(screen.getByText('Each statement is a bill')).toBeInTheDocument();
  });

  it('CardTitle and CardSubtitle support as and truncate props', () => {
    render(
      <Card>
        <CardHeader>
          <div>
            <CardTitle as="h2" truncate={false}>Needs you</CardTitle>
            <CardSubtitle as="span" truncate={false}>Action required</CardSubtitle>
          </div>
        </CardHeader>
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
        <CardRow>
          <span>Amex bill</span>
          <span>₹33,900</span>
        </CardRow>
        <CardRow>
          <span>Rent</span>
          <span>₹25,000</span>
        </CardRow>
      </Card>,
    );
    expect(screen.getByText('Amex bill')).toBeInTheDocument();
    expect(screen.getByText('Rent')).toBeInTheDocument();
  });

  it('renders section bands inside card', () => {
    render(
      <Card>
        <CardSection>Act now · 2</CardSection>
        <CardRow>Item 1</CardRow>
      </Card>,
    );
    expect(screen.getByText('Act now · 2')).toBeInTheDocument();
    expect(screen.getByText('Item 1')).toBeInTheDocument();
  });

  it('renders empty state without extra top border divider', () => {
    const { container } = render(
      <Card title="Untagged · 0">
        <CardEmpty>Every transaction has a category.</CardEmpty>
      </Card>,
    );
    const emptyEl = screen.getByText('Every transaction has a category.');
    expect(emptyEl).toBeInTheDocument();
    expect(container.querySelector('.font-text.text-body.text-ink-3')).not.toHaveClass('border-t');
  });

  it('renders footer with px-space-16 padding', () => {
    const { container } = render(
      <Card title="List">
        <CardFooter>
          <span>Pagination info</span>
        </CardFooter>
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
    expect(container.firstChild).toHaveClass('overflow-hidden', 'min-w-0');
  });
});

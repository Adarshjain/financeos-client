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
        action={<button type="button">Inbox ›</button>}
      />,
    );
    expect(screen.getByText('Needs you')).toBeInTheDocument();
    expect(screen.getByText('Act now · 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Inbox ›' })).toBeInTheDocument();
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

  it('renders empty state', () => {
    render(
      <Card title="Untagged · 0">
        <CardEmpty>Every transaction has a category.</CardEmpty>
      </Card>,
    );
    expect(screen.getByText('Every transaction has a category.')).toBeInTheDocument();
  });

  it('renders footer', () => {
    render(
      <Card title="List">
        <CardFooter>
          <span>Pagination info</span>
        </CardFooter>
      </Card>,
    );
    expect(screen.getByText('Pagination info')).toBeInTheDocument();
  });
});

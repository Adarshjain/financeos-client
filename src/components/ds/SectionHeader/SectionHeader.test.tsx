import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { SectionHeader } from './SectionHeader';

describe('SectionHeader', () => {
  it('renders date variant with label, weekday meta, and sticky positioning', () => {
    const { container } = render(
      <SectionHeader variant="date" label="12 Oct" meta="Mon" />,
    );
    expect(screen.getByText('12 Oct')).toBeInTheDocument();
    expect(screen.getByText('Mon')).toBeInTheDocument();
    expect(container.firstChild).toHaveClass(
      'bg-subtle',
      'border-b',
      'sticky',
      'top-0',
      'z-sticky',
    );
  });

  it('renders date variant with sticky=false', () => {
    const { container } = render(
      <SectionHeader variant="date" label="12 Oct" sticky={false} />,
    );
    expect(container.firstChild).not.toHaveClass('sticky');
  });

  it('renders band variant with overline text in ink-4 on bg-sunken', () => {
    const { container } = render(
      <SectionHeader variant="band" label="Basics" />,
    );
    expect(screen.getByText('Basics')).toBeInTheDocument();
    expect(container.firstChild).toHaveClass(
      'bg-sunken',
      'text-ink-4',
      'uppercase',
    );
  });

  it('renders month variant with summary meta', () => {
    render(
      <SectionHeader
        variant="month"
        label="September 2026"
        meta="61 transactions · out ₹1,05,219"
      />,
    );
    expect(screen.getByText('September 2026')).toBeInTheDocument();
    expect(
      screen.getByText('· 61 transactions · out ₹1,05,219'),
    ).toBeInTheDocument();
  });

  it('renders danger variant with text-danger', () => {
    const { container } = render(
      <SectionHeader variant="danger" label="Delete account" />,
    );
    expect(screen.getByText('Delete account')).toBeInTheDocument();
    expect(container.firstChild).toHaveClass('text-danger', 'bg-sunken');
  });

  it('supports children as fallback for label', () => {
    render(<SectionHeader variant="band">Card details</SectionHeader>);
    expect(screen.getByText('Card details')).toBeInTheDocument();
  });
});

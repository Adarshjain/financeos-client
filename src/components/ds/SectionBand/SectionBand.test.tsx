import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { SectionBand } from './SectionBand';

describe('SectionBand', () => {
  it('renders section title', () => {
    render(<SectionBand title="Card details" />);
    expect(screen.getByText('Card details')).toBeInTheDocument();
  });

  it('renders children if title prop is omitted', () => {
    render(<SectionBand>Sync & net worth</SectionBand>);
    expect(screen.getByText('Sync & net worth')).toBeInTheDocument();
  });

  it('applies default styling tokens', () => {
    const { container } = render(<SectionBand title="Basics" />);
    expect(container.firstChild).toHaveClass(
      'bg-sunken',
      'text-ink-4',
      'text-overline',
      'uppercase',
    );
  });

  it('applies danger styling when variant is danger', () => {
    const { container } = render(
      <SectionBand variant="danger" title="Delete account" />,
    );
    expect(container.firstChild).toHaveClass('text-danger');
  });

  it('handles border overrides', () => {
    const { container } = render(
      <SectionBand
        title="No borders"
        borderTop={false}
        borderBottom={false}
      />,
    );
    expect(container.firstChild).toHaveClass('border-t-0', 'border-b-0');
  });

  it('renders trailing action element', () => {
    render(
      <SectionBand
        title="Limits"
        action={<span data-testid="band-action">Edit</span>}
      />,
    );
    expect(screen.getByTestId('band-action')).toBeInTheDocument();
  });
});

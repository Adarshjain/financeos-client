import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { SectionHeader } from './SectionHeader';

describe('SectionHeader', () => {
  it('renders strong variant with children, weekday meta, and sticky positioning', () => {
    const { container } = render(
      <SectionHeader variant="strong" meta="Mon">
        12 Oct
      </SectionHeader>,
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

  it('renders strong variant with sticky=false', () => {
    const { container } = render(
      <SectionHeader variant="strong" sticky={false}>
        12 Oct
      </SectionHeader>,
    );
    expect(container.firstChild).not.toHaveClass('sticky');
  });

  it('renders band variant with overline text in ink-4 on bg-sunken', () => {
    const { container } = render(
      <SectionHeader variant="band">Basics</SectionHeader>,
    );
    expect(screen.getByText('Basics')).toBeInTheDocument();
    expect(container.firstChild).toHaveClass(
      'bg-sunken',
      'text-ink-4',
      'uppercase',
    );
  });

  it('renders band variant with meta', () => {
    render(
      <SectionHeader
        variant="band"
        meta="61 transactions · out ₹1,05,219"
      >
        September 2026
      </SectionHeader>,
    );
    expect(screen.getByText('September 2026')).toBeInTheDocument();
    expect(
      screen.getByText('61 transactions · out ₹1,05,219'),
    ).toBeInTheDocument();
  });

  it('renders danger tone with text-danger', () => {
    const { container } = render(
      <SectionHeader variant="band" tone="danger">
        Delete account
      </SectionHeader>,
    );
    expect(screen.getByText('Delete account')).toBeInTheDocument();
    expect(container.firstChild).toHaveClass('text-danger', 'bg-sunken');
  });

  it('renders custom heading element via as prop', () => {
    render(
      <SectionHeader as="h3" variant="strong">
        Section heading
      </SectionHeader>,
    );
    const heading = screen.getByRole('heading', { level: 3 });
    expect(heading).toBeInTheDocument();
    expect(heading).toHaveTextContent('Section heading');
  });

  it('draws the action at the right end, after meta', () => {
    render(
      <SectionHeader variant="band" meta="3" action={<button>Show</button>}>
        Closed
      </SectionHeader>,
    );
    const action = screen.getByRole('button', { name: 'Show' }).parentElement!;
    expect(action).toHaveClass('ml-auto', 'shrink-0');
    expect(action.previousElementSibling).toHaveTextContent('3');
  });

  it('renders no action wrapper without an action', () => {
    const { container } = render(<SectionHeader variant="band">Closed</SectionHeader>);
    expect(container.firstChild!.childNodes).toHaveLength(1);
  });
});

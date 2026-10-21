import { render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { Highlight } from './Highlight';

const marks = (c: HTMLElement) => Array.from(c.querySelectorAll('mark'));

describe('Highlight', () => {
  it('renders plain text with no mark when there is no query', () => {
    const { container } = render(<Highlight text="Swiggy order" />);
    expect(marks(container)).toHaveLength(0);
    expect(container.textContent).toBe('Swiggy order');
  });

  it('marks a single match case-insensitively and keeps the original casing', () => {
    const { container } = render(<Highlight text="Adyar Anandha Bhavan" query="ANANDHA" />);
    expect(marks(container).map((m) => m.textContent)).toEqual(['Anandha']);
    expect(container.textContent).toBe('Adyar Anandha Bhavan');
  });

  it('marks every occurrence', () => {
    const { container } = render(<Highlight text="HDFC to hdfc to Hdfc" query="hdfc" />);
    expect(marks(container)).toHaveLength(3);
  });

  it('treats regex characters in the query as literal', () => {
    const { container } = render(<Highlight text="a.b axb (x)" query="a.b" />);
    expect(marks(container).map((m) => m.textContent)).toEqual(['a.b']);
    const paren = render(<Highlight text="a.b axb (x)" query="(x)" />);
    expect(marks(paren.container).map((m) => m.textContent)).toEqual(['(x)']);
  });

  it('matches a numeric query across grouping commas', () => {
    const a = render(<Highlight text="3,600.00" query="3600" />);
    expect(marks(a.container).map((m) => m.textContent)).toEqual(['3,600']);
    const b = render(<Highlight text="1,249.5" query="1249.5" />);
    expect(marks(b.container).map((m) => m.textContent)).toEqual(['1,249.5']);
  });

  it('does not ignore commas for a non-numeric query', () => {
    const { container } = render(<Highlight text="a,b ab" query="ab" />);
    expect(marks(container).map((m) => m.textContent)).toEqual(['ab']);
    expect(container.textContent).toBe('a,b ab');
  });

  it('returns plain text for a whitespace query', () => {
    const { container } = render(<Highlight text="Swiggy" query="   " />);
    expect(marks(container)).toHaveLength(0);
  });

  it('keeps the same marks on re-render with the same query and remounts them for a new query', () => {
    const { container, rerender } = render(<Highlight text="Anandha Anandha" query="anandha" />);
    const first = marks(container);
    rerender(<Highlight text="Anandha Anandha" query="anandha" />);
    expect(marks(container)[0]).toBe(first[0]);
    rerender(<Highlight text="Anandha Anandha" query="anand" />);
    expect(marks(container)[0]).not.toBe(first[0]);
  });
});

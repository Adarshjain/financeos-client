import { render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { Text, TextTone, TextVariant } from './Text';

describe('Text component', () => {
  it('renders children correctly', () => {
    render(<Text>Hello world</Text>);
    expect(screen.getByText('Hello world')).toBeInTheDocument();
  });

  it('defaults to span tag with body variant and ink tone without forcing font-family or text-align', () => {
    render(<Text>Default text</Text>);
    const el = screen.getByText('Default text');
    expect(el.tagName).toBe('SPAN');
    expect(el).toHaveClass('text-body', 'text-ink');
    expect(el).not.toHaveClass('font-text', 'font-display', 'text-left', 'text-center', 'text-right');
  });

  it('supports all 12 type styles through variant prop', () => {
    const variants: Record<TextVariant, string[]> = {
      'hero-figure': ['text-hero-figure'],
      'page-title': ['text-page-title'],
      'screen-title': ['text-screen-title'],
      figure: ['text-figure'],
      title: ['text-title'],
      heading: ['text-heading'],
      body: ['text-body'],
      'body-strong': ['text-body-strong'],
      label: ['text-label'],
      caption: ['text-caption'],
      overline: ['text-overline', 'uppercase'],
      'micro': ['text-micro'],
    };

    for (const [variant, classes] of Object.entries(variants) as [TextVariant, string[]][]) {
      const { unmount } = render(<Text variant={variant}>{variant}</Text>);
      const el = screen.getByText(variant);
      for (const cls of classes) {
        expect(el).toHaveClass(cls);
      }
      unmount();
    }
  });

  it('supports all 8 semantic tones', () => {
    const tones: Record<TextTone, string> = {
      ink: 'text-ink',
      'ink-2': 'text-ink-2',
      'ink-3': 'text-ink-3',
      'ink-4': 'text-ink-4',
      positive: 'text-positive',
      danger: 'text-danger',
      warning: 'text-warning',
      info: 'text-info',
    };

    for (const [tone, cls] of Object.entries(tones) as [TextTone, string][]) {
      const { unmount } = render(<Text tone={tone}>{tone}</Text>);
      const el = screen.getByText(tone);
      expect(el).toHaveClass(cls);
      unmount();
    }
  });

  it('renders custom element using as prop', () => {
    const { rerender } = render(<Text as="h1">Title</Text>);
    expect(screen.getByRole('heading', { level: 1 })).toBeInTheDocument();

    rerender(<Text as="p">Paragraph</Text>);
    expect(screen.getByText('Paragraph').tagName).toBe('P');

    rerender(<Text as="label">Label tag</Text>);
    expect(screen.getByText('Label tag').tagName).toBe('LABEL');

    rerender(<Text as="div">Div tag</Text>);
    expect(screen.getByText('Div tag').tagName).toBe('DIV');
  });

  it('supports text and display font families', () => {
    const { rerender } = render(<Text family="text">Text font</Text>);
    expect(screen.getByText('Text font')).toHaveClass('font-text');

    rerender(<Text family="display">Display font</Text>);
    expect(screen.getByText('Display font')).toHaveClass('font-display');
  });

  it('supports alignment options', () => {
    const { rerender } = render(<Text align="start">Start</Text>);
    expect(screen.getByText('Start')).toHaveClass('text-left');

    rerender(<Text align="center">Center</Text>);
    expect(screen.getByText('Center')).toHaveClass('text-center');

    rerender(<Text align="end">End</Text>);
    expect(screen.getByText('End')).toHaveClass('text-right');
  });

  it('handles truncate prop', () => {
    const { rerender } = render(<Text truncate>Truncated text</Text>);
    expect(screen.getByText('Truncated text')).toHaveClass('truncate');

    rerender(<Text truncate={false}>Not truncated</Text>);
    expect(screen.getByText('Not truncated')).not.toHaveClass('truncate');
  });

  it('switches to the mono family and keeps the type style', () => {
    const { rerender } = render(<Text variant="caption">Plain</Text>);
    expect(screen.getByText('Plain')).not.toHaveClass('font-mono');
    rerender(<Text variant="caption" mono>GMAIL_AUTH_EXPIRED</Text>);
    expect(screen.getByText('GMAIL_AUTH_EXPIRED')).toHaveClass('font-mono', 'text-caption', 'text-ink');
  });

  it('forwards refs correctly', () => {
    const ref = React.createRef<HTMLHeadingElement>();
    render(<Text as="h2" ref={ref}>Heading with ref</Text>);
    expect(ref.current).toBeInstanceOf(HTMLHeadingElement);
  });

  it('merges className for layout', () => {
    render(<Text className="mt-space-8 max-w-md">Layout</Text>);
    const el = screen.getByText('Layout');
    expect(el).toHaveClass('mt-space-8', 'max-w-md', 'text-body', 'text-ink');
  });

  describe('fraction="small"', () => {
    const frac = (c: HTMLElement) => c.querySelector('[data-fraction]');

    it.each([
      ['+50,000.00', '+50,000', '.00'],
      ['₹1,250.75', '₹1,250', '.75'],
      ['-12.5', '-12', '.5'],
    ])('splits %s at the last dot', (input, int, fr) => {
      const { container } = render(<Text variant="figure" fraction="small">{input}</Text>);
      expect(frac(container)?.textContent).toBe(fr);
      expect(container.firstElementChild?.textContent).toBe(int + fr);
      expect(container.firstElementChild?.firstChild?.textContent).toBe(int);
    });

    it('splits a number child', () => {
      const { container } = render(<Text fraction="small">{12.5}</Text>);
      expect(frac(container)?.textContent).toBe('.5');
    });

    it('leaves text without a decimal point and non-string children unchanged', () => {
      const a = render(<Text fraction="small">₹1,250</Text>);
      expect(frac(a.container)).toBeNull();
      const b = render(<Text fraction="small"><b>1.50</b></Text>);
      expect(frac(b.container)).toBeNull();
    });

    it('does nothing when the prop is off', () => {
      const { container } = render(<Text>₹1,250.75</Text>);
      expect(frac(container)).toBeNull();
    });

    it.each([
      ['hero-figure', 'text-figure'],
      ['figure', 'text-title'],
      ['title', 'text-heading'],
      ['heading', 'text-label'],
      ['body', 'text-label'],
      ['body-strong', 'text-label'],
      ['label', 'text-caption'],
    ] as const)('maps %s to %s', (variant, cls) => {
      const { container } = render(<Text variant={variant} fraction="small">1.00</Text>);
      expect(frac(container)).toHaveClass(cls);
    });

    it('mutes the fraction to ink-3 for ink, keeps tone for positive and danger', () => {
      const a = render(<Text fraction="small">1.00</Text>);
      expect(frac(a.container)).toHaveClass('text-ink-3');
      const b = render(<Text tone="positive" fraction="small">1.00</Text>);
      expect(frac(b.container)).not.toHaveClass('text-ink-3');
      const c = render(<Text tone="danger" fraction="small">1.00</Text>);
      expect(frac(c.container)).not.toHaveClass('text-ink-3');
    });
  });
});

import fs from 'node:fs';
import path from 'node:path';

import { render } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';

import { Icon } from './Icon';
import * as registryModule from './registry';
import { iconRegistry } from './registry';

describe('Icon registry', () => {
  it('maps names that match design-system/icons.json exactly', () => {
    const jsonPath = path.resolve(process.cwd(), 'design-system/icons.json');
    const jsonContent = JSON.parse(fs.readFileSync(jsonPath, 'utf8')) as Array<{
      name: string;
      phosphor: string;
      use: string;
    }>;

    const jsonNames = jsonContent.map((item) => item.name).sort();
    const registryNames = Object.keys(iconRegistry).sort();

    expect(registryNames).toEqual(jsonNames);
  });

  it('exports only iconRegistry and type IconName from registry.ts', () => {
    const exportedKeys = Object.keys(registryModule);
    expect(exportedKeys).toEqual(['iconRegistry']);
  });
});

describe('Icon component', () => {
  it('renders a Phosphor icon at md size by default with bold weight, currentColor, and aria-hidden', () => {
    const { container } = render(<Icon name="chevron-down" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass('w-icon-md', 'h-icon-md');
    expect(svg).toHaveAttribute('aria-hidden', 'true');
    expect(svg).toHaveAttribute('fill', 'currentColor');
  });

  it('renders with size="sm"', () => {
    const { container } = render(<Icon name="chevron-down" size="sm" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass('w-icon-sm', 'h-icon-sm');
  });

  it('renders with size="lg"', () => {
    const { container } = render(<Icon name="chevron-down" size="lg" />);
    const svg = container.querySelector('svg');
    expect(svg).toBeInTheDocument();
    expect(svg).toHaveClass('w-icon-lg', 'h-icon-lg');
  });

  it('merges custom className for layout', () => {
    const { container } = render(
      <Icon name="search" className="ml-auto" />
    );
    const svg = container.querySelector('svg');
    expect(svg).toHaveClass('ml-auto');
  });
});

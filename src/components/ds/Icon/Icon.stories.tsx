import type { Meta, StoryObj } from '@storybook/react';
import React, { useState } from 'react';

import iconsData from '../../../../design-system/icons.json';
import { Icon } from './Icon';
import { IconName, iconRegistry } from './registry';

const meta: Meta<typeof Icon> = {
  title: 'DS/Foundations/Icons',
  component: Icon,
  argTypes: {
    name: {
      control: 'select',
      options: Object.keys(iconRegistry),
    },
    size: {
      control: 'select',
      options: ['sm', 'md', 'lg'],
    },
  },
};

export default meta;
type Story = StoryObj<typeof Icon>;

function AllIconsShowcase() {
  const [query, setQuery] = useState('');
  const [copiedName, setCopiedName] = useState<string | null>(null);

  const cleanQuery = query.toLowerCase().trim();
  const filtered = iconsData.filter(
    (item) =>
      !cleanQuery ||
      item.name.toLowerCase().includes(cleanQuery) ||
      item.use.toLowerCase().includes(cleanQuery) ||
      item.phosphor.toLowerCase().includes(cleanQuery),
  );

  const handleCopy = (name: string) => {
    const snippet = `<Icon name="${name}" />`;
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(snippet).catch(() => {});
    }
    setCopiedName(name);
    setTimeout(() => {
      setCopiedName((curr) => (curr === name ? null : curr));
    }, 1500);
  };

  return (
    <div className="p-space-16 bg-canvas min-h-full flex flex-col gap-space-16 font-text text-ink w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-space-12 border-b border-line pb-space-12">
        <div className="flex flex-col gap-space-4">
          <h2 className="text-screen-title text-ink font-bold">Icon Registry</h2>
          <p className="text-caption text-ink-3">
            {iconsData.length} approved icons · Phosphor bold · Click any tile to copy JSX snippet
          </p>
        </div>
        <div className="relative w-full sm:w-64">
          <div className="absolute left-space-10 top-1/2 -translate-y-1/2 text-ink-3 pointer-events-none flex items-center">
            <Icon name="search" size="sm" />
          </div>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search name or use…"
            aria-label="Search icons"
            className="w-full pl-space-32 pr-space-28 py-space-6 rounded-ds-md border border-line-soft bg-surface text-body text-ink placeholder:text-ink-faint focus:outline-none focus:border-line-strong"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery('')}
              className="absolute right-space-8 top-1/2 -translate-y-1/2 text-ink-3 hover:text-ink p-space-2 rounded-ds-xs"
              aria-label="Clear search"
            >
              <Icon name="close" size="sm" />
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="p-space-32 text-center text-ink-3 text-body bg-surface rounded-ds-md border border-line-soft">
          No icons matching &ldquo;{query}&rdquo;
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-space-8">
          {filtered.map((item) => {
            const isCopied = copiedName === item.name;
            return (
              <button
                key={item.name}
                type="button"
                onClick={() => handleCopy(item.name)}
                className="flex flex-col items-center gap-space-8 p-space-12 border border-line-soft rounded-ds-md bg-surface hover:bg-hover hover:border-line-strong transition-colors text-center w-full cursor-pointer group focus:outline-none focus:ring-1 focus:ring-brand"
              >
                <div className="flex gap-space-10 items-center text-ink-2 py-space-4">
                  <Icon name={item.name as IconName} size="sm" />
                  <Icon name={item.name as IconName} size="md" />
                  <Icon name={item.name as IconName} size="lg" />
                </div>
                <code className="font-mono text-caption text-ink-3 group-hover:text-ink font-semibold">
                  {item.name}
                </code>
                <span className="text-caption text-ink-3 leading-tight line-clamp-2">
                  {item.use}
                </span>
                {isCopied && (
                  <span className="text-caption text-positive font-semibold">
                    Copied &lt;Icon name=&quot;{item.name}&quot; /&gt;
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

export const AllIcons: Story = {
  name: 'All icons',
  render: () => <AllIconsShowcase />,
};

export const Playground: Story = {
  args: {
    name: 'chevron-down',
    size: 'md',
  },
  render: (args) => (
    <div className="p-space-24 bg-canvas min-h-full flex items-center justify-center text-ink">
      <Icon {...args} />
    </div>
  ),
};

export const Sizes: Story = {
  render: () => (
    <div className="p-space-24 bg-canvas min-h-full flex flex-col gap-space-16 w-full max-w-xl">
      <h3 className="text-screen-title text-ink font-bold">Icon and typography weight comparison</h3>
      <div className="bg-surface border border-line-soft rounded-ds-lg p-space-16 flex flex-col gap-space-16">
        <div className="flex items-center gap-space-8 text-ink">
          <Icon name="check" size="sm" />
          <span className="text-label text-ink-2">
            12px label text with sm (14px) icon · chips, carets, small buttons
          </span>
        </div>
        <div className="flex items-center gap-space-8 text-ink">
          <Icon name="check" size="md" />
          <span className="text-body text-ink">
            13px body text with md (16px) icon · buttons, bars, rows, menu items
          </span>
        </div>
        <div className="flex items-center gap-space-8 text-ink">
          <Icon name="check" size="lg" />
          <span className="text-heading text-ink">
            14px heading text with lg (20px) icon · tab bar, desktop rail, selection bar
          </span>
        </div>
      </div>
    </div>
  ),
};

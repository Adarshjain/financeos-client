import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { useArgs } from 'storybook/preview-api';
import { fn } from 'storybook/test';

import { FilterBar, type FilterBarProps, FilterChip, Select } from '@/components/ds';

type StoryArgs = FilterBarProps & { text: string; placeholder: string; withSearch: boolean };

const meta: Meta<StoryArgs> = {
  title: 'DS/Form fields/FilterBar',
  component: FilterBar,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      description: {
        component:
          'The search and filter row of a list page: the search field first, then the chips, one row that scrolls sideways and carries its own bleed so the focus ring is not clipped. On phone the field rests narrow and grows to the viewport inset width while focused or holding text, then shrinks back; on desktop it is a fixed container-xs field. Chips are FilterChips in the default pill shape.',
      },
    },
  },
  argTypes: {
    text: { control: 'text', description: 'The search text (`search.value`)' },
    placeholder: { control: 'text', description: '`search.placeholder`' },
    size: { control: 'inline-radio', options: ['sm', 'md'], description: "Match the chips' size: sm 28px (default), md 32px" },
    withSearch: { control: 'boolean', description: 'Off: the row is just the chips' },
    search: { control: false },
    children: { control: false },
  },
  args: { text: '', placeholder: 'Search', withSearch: true },
};
export default meta;
type Story = StoryObj<StoryArgs>;

const CHIPS = ['All', 'Stocks', 'Mutual funds', 'Bonds', 'Gold', 'ETFs'];

function Row({ text, placeholder, withSearch, onText, size }: { text: string; placeholder: string; withSearch: boolean; onText: (v: string) => void; size?: 'sm' | 'md' }) {
  const [selected, setSelected] = React.useState('All');
  const [sort, setSort] = React.useState('value');
  return (
    <FilterBar size={size} search={withSearch ? { value: text, onValueChange: onText, placeholder } : undefined}>
      {CHIPS.map((c) => (
        <FilterChip key={c} size={size} className="shrink-0" selected={selected === c} onClick={() => setSelected(c)}>
          {c}
        </FilterChip>
      ))}
      <Select
        value={sort}
        options={[
          { value: 'value', label: 'Value' },
          { value: 'name', label: 'Name' },
        ]}
        onValueChange={(v) => setSort(String(v))}
        trigger={
          <FilterChip hasDropdown size={size} className="shrink-0">
            {sort === 'value' ? 'Value' : 'Name'}
          </FilterChip>
        }
      />
    </FilterBar>
  );
}

export const Playground: Story = {
  render: function Render(args) {
    const [, updateArgs] = useArgs();
    return <Row size={args.size} text={args.text} placeholder={args.placeholder} withSearch={args.withSearch} onText={(text) => updateArgs({ text })} />;
  },
};

export const WithText: Story = {
  args: { text: 'hdfc' },
  render: (args) => <Row text={args.text} placeholder={args.placeholder} withSearch onText={fn()} />,
};

export const Medium: Story = {
  args: { size: 'md' },
  render: (args) => <Row size="md" text={args.text} placeholder={args.placeholder} withSearch onText={fn()} />,
};

export const ChipsOnly: Story = {
  args: { withSearch: false },
  render: (args) => <Row text="" placeholder={args.placeholder} withSearch={false} onText={fn()} />,
};

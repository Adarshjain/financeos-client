import type { Meta, StoryObj } from '@storybook/react';
import React from 'react';
import { useArgs } from 'storybook/preview-api';
import { fn } from 'storybook/test';

import {
  Button,
  Icon,
  type IconName,
  Kbd,
  SearchPalette,
  type SearchPaletteGroup,
  type SearchPaletteProps,
  Text,
} from '@/components/ds';

/** `query` mirrors what was typed (the palette owns the field, so fast typing never lags behind Storybook's async args). */
type StoryArgs = SearchPaletteProps & { lastOpened?: string; query?: string };

/** What the app's search endpoint would return, flattened: one row each, with the words it matches on. */
interface Hit {
  id: string;
  group: 'Accounts' | 'Actions' | 'Transactions' | 'Pages' | 'Ask';
  icon?: IconName;
  name?: string;
  text: string;
  trailing?: React.ReactNode;
  always?: boolean;
}

const hits: Hit[] = [
  { id: 'acc-regalia', group: 'Accounts', icon: 'wallet', name: 'HDFC Regalia Gold', text: '••7741 · you owe ₹44,319' },
  { id: 'acc-regalia-stmts', group: 'Accounts', text: 'Regalia · Statements', trailing: <Text as="span" variant="caption" tone="ink-3">3</Text> },
  { id: 'acc-regalia-rules', group: 'Accounts', text: 'Regalia · Earning rules', trailing: <Text as="span" variant="caption" tone="ink-3">2 rules</Text> },
  { id: 'acc-amex', group: 'Accounts', icon: 'wallet', name: 'Amex Platinum Travel', text: '••1009 · you owe ₹33,900' },
  { id: 'acc-hdfc-sav', group: 'Accounts', icon: 'wallet', name: 'HDFC Bank Savings', text: '••4410 · ₹2,95,030' },
  { id: 'act-add-regalia', group: 'Actions', icon: 'add', text: 'Add transaction on Regalia', trailing: <Kbd>⌘N</Kbd> },
  { id: 'act-upload-regalia', group: 'Actions', icon: 'upload', text: 'Upload a Regalia statement' },
  { id: 'act-paid-regalia', group: 'Actions', icon: 'check', text: 'Mark Regalia bill paid · ₹44,319' },
  { id: 'act-add', group: 'Actions', icon: 'add', text: 'Add transaction', trailing: <Kbd>⌘N</Kbd>, always: true },
  { id: 'act-upload', group: 'Actions', icon: 'upload', text: 'Upload a statement', always: true },
  { id: 'txn-payment', group: 'Transactions', text: 'Payment received · NetBanking · 18 Sep · Regalia', trailing: <Text as="span" variant="body-strong" tone="positive">+₹46,800</Text> },
  { id: 'txn-croma', group: 'Transactions', text: 'Croma Electronics · 9 Sep · Regalia', trailing: <Text as="span" variant="body-strong">₹24,990</Text> },
  { id: 'txn-swiggy', group: 'Transactions', text: 'Swiggy Bangalore · 11 Oct · Amex', trailing: <Text as="span" variant="body-strong">₹533</Text> },
  { id: 'txn-bigbasket', group: 'Transactions', text: 'BigBasket · 12 Oct · HDFC Bank Savings', trailing: <Text as="span" variant="body-strong">₹3,600</Text> },
  { id: 'page-rewards-regalia', group: 'Pages', icon: 'chevron-right', text: 'Rewards · HDFC Regalia Gold' },
  { id: 'page-home', group: 'Pages', icon: 'chevron-right', text: 'Home', always: true },
  { id: 'page-inbox', group: 'Pages', icon: 'chevron-right', text: 'Inbox', always: true },
  { id: 'page-upcoming', group: 'Pages', icon: 'chevron-right', text: 'Upcoming', always: true },
  { id: 'page-transactions', group: 'Pages', icon: 'chevron-right', text: 'Transactions', always: true },
];

const order: Hit['group'][] = ['Accounts', 'Actions', 'Transactions', 'Pages', 'Ask'];

/** Stands in for the app's search call. */
function search(query: string, onOpen: (label: string) => void): SearchPaletteGroup[] {
  const q = query.trim().toLowerCase();
  const found = hits.filter((h) => (q ? `${h.name ?? ''} ${h.text}`.toLowerCase().includes(q) : h.always));
  const groups: SearchPaletteGroup[] = order.map((group) => {
    const items = found.filter((h) => h.group === group);
    return {
      id: group,
      label: group,
      meta: group === 'Transactions' && items.length ? `${items.length} found` : undefined,
      items: items.map((h) => ({
        id: h.id,
        leading: h.icon && <Icon name={h.icon} size="sm" />,
        title: h.name ? (
          <>
            <Text as="span" variant="body-strong">{h.name}</Text> {h.text}
          </>
        ) : (
          h.text
        ),
        trailing: h.trailing,
        onSelect: () => onOpen(h.name ?? h.text),
      })),
    };
  });
  if (q) {
    groups.push({
      id: 'ask',
      label: 'Ask',
      items: [
        {
          id: 'ask',
          leading: <Icon name="chat" size="sm" />,
          title: `Ask the data: "${query.trim()}"`,
          onSelect: () => onOpen(`Ask: ${query.trim()}`),
        },
      ],
    });
  }
  return groups;
}

const meta: Meta<StoryArgs> = {
  title: 'DS/Overlays/SearchPalette',
  component: SearchPalette,
  tags: ['autodocs'],
  parameters: {
    layout: 'padded',
    docs: {
      story: { inline: false, iframeHeight: 640 },
      // The results are React nodes; generating the JSX snippet from them on every keystroke hangs the dev preview.
      source: { type: 'code' },
      description: {
        component:
          'The ⌘K search over everything. Click Search or press ⌘K / Ctrl+K, then type (try "regalia", "swiggy" or "zomato"). Arrow keys move the highlight, Enter or a click opens the row and closes the palette; Esc closes it. On phone it is a sheet. The × in the field clears the text. The page runs the search and passes the grouped results; the palette never filters.',
      },
    },
  },
  args: {
    open: false,
    loading: false,
    shortcutKey: 'k',
    placeholder: 'Search…',
    onOpenChange: fn(),
    onValueChange: fn(),
  },
  argTypes: {
    open: { control: 'boolean' },
    value: { control: false },
    loading: { control: 'boolean' },
    hint: { control: 'text' },
    shortcutKey: { control: 'text' },
    placeholder: { control: 'text' },
    clearLabel: { control: 'text' },
    moveLabel: { control: 'text' },
    openLabel: { control: 'text' },
    srTitle: { control: 'text' },
    groups: { control: false },
    emptyLabel: { control: false },
    defaultOpen: { control: false },
    defaultValue: { control: false },
    lastOpened: { table: { disable: true } },
    query: { table: { disable: true } },
  },
};

export default meta;
type Story = StoryObj<StoryArgs>;

export const GlobalSearch: Story = {
  render: function Render(args) {
    const [{ open, query, lastOpened }, updateArgs] = useArgs<StoryArgs>();
    return (
      <div className="flex flex-col items-start gap-space-12">
        <Button onClick={() => updateArgs({ open: true })}>
          <Icon name="search" size="sm" />
          Search
          <Kbd>⌘K</Kbd>
        </Button>
        {lastOpened && <Text tone="ink-3">Opened: {lastOpened}</Text>}
        <SearchPalette
          {...args}
          open={open}
          groups={search(query ?? '', (label) => updateArgs({ lastOpened: label }))}
          onOpenChange={(next) => {
            updateArgs({ open: next });
            args.onOpenChange?.(next);
          }}
          onValueChange={(next) => {
            updateArgs({ query: next });
            args.onValueChange?.(next);
          }}
        />
      </div>
    );
  },
};

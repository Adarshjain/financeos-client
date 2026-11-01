import type { Meta, StoryObj } from '@storybook/react';
import { useArgs } from 'storybook/preview-api';
import { fn } from 'storybook/test';

import { CategoryPicker } from '@/components/organisms';
import { CATEGORY_LIST_FIXTURE } from '@/lib/categoryList.fixtures';

const RECENT = [
  { categoryKey: 'transport', subcategoryKey: 'transport.cabs' },
  { categoryKey: 'groceries', subcategoryKey: null },
  { categoryKey: 'bills', subcategoryKey: 'bills.rent' },
  { categoryKey: 'shopping', subcategoryKey: null },
];

const meta: Meta<typeof CategoryPicker> = {
  title: 'Organisms/CategoryPicker',
  component: CategoryPicker,
  tags: ['autodocs'],
  parameters: { layout: 'fullscreen' },
  args: {
    open: true,
    categories: CATEGORY_LIST_FIXTURE,
    direction: 'OUT',
    title: 'Category',
    subtitle: 'Swiggy · ₹486.00',
    recent: RECENT,
    onPick: fn(),
    onOpenChange: fn(),
  },
  argTypes: {
    open: { control: 'boolean' },
    direction: { control: 'inline-radio', options: ['OUT', 'IN'] },
    categories: { control: false },
    value: { control: 'object' },
    recent: { control: 'object' },
    title: { control: 'text' },
    subtitle: { control: 'text' },
    initialCategoryKey: { control: 'text' },
    initialQuery: { control: 'text' },
    onPick: { control: false },
    onOpenChange: { control: false },
  },
  render: function Render(args) {
    const [, updateArgs] = useArgs();
    return (
      <CategoryPicker
        {...args}
        onOpenChange={(open) => {
          args.onOpenChange?.(open);
          updateArgs({ open });
        }}
      />
    );
  },
};

export default meta;
type Story = StoryObj<typeof CategoryPicker>;

const phone = { viewport: { value: 'phone', isRotated: false } };

/** Money out: the grid of categories, a search line and the Recent row. Tapping a category with sub-categories opens its list; one without saves at once. */
export const Grid: Story = { globals: phone };

/** Food opened: back, the big icon, its sub-categories with Others last. The current pick has no sub-category, so Others is ticked (a tick saves nothing). */
export const SubList: Story = {
  globals: phone,
  args: { initialCategoryKey: 'food', value: { categoryKey: 'food', subcategoryKey: null } },
};

/** Search "zom": the shop finds Food · Delivery, with the matched word as the hint. */
export const Search: Story = { globals: phone, args: { initialQuery: 'zom' } };

/** Money in: the money-in categories, no Recent row. */
export const MoneyIn: Story = {
  globals: phone,
  args: { direction: 'IN', subtitle: 'Northwind Labs · ₹1,20,000.00', recent: [] },
};

/** The same grid as a centred dialog at 1440, with the current pick marked. */
export const Desktop: Story = {
  globals: { viewport: { value: 'desktop', isRotated: false } },
  args: { value: { categoryKey: 'food', subcategoryKey: 'food.delivery' } },
};

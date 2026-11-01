import { categoriesForDirection, categoryLabel, findCategory, findSub, type PickerDirection, subsForDirection } from '@/lib/categoryList';
import type { CategoryDef, CategoryPick } from '@/lib/categoryList.types';

/** Everyday words and shop names that point at a category (and a sub-category), for the picker's search. Keys come from the fixed list. */
const SYNONYMS: { words: string[]; categoryKey: string; subcategoryKey?: string }[] = [
  { words: ['zomato', 'swiggy', 'delivery', 'takeaway'], categoryKey: 'food', subcategoryKey: 'food.delivery' },
  { words: ['restaurant', 'lunch', 'dinner', 'breakfast'], categoryKey: 'food', subcategoryKey: 'food.dining' },
  { words: ['coffee', 'tea', 'starbucks', 'chai'], categoryKey: 'food', subcategoryKey: 'food.cafes' },
  { words: ['beer', 'wine', 'bar', 'pub'], categoryKey: 'food', subcategoryKey: 'food.drinks' },
  { words: ['blinkit', 'zepto', 'bigbasket', 'instamart', 'vegetables'], categoryKey: 'groceries' },
  { words: ['uber', 'ola', 'rapido', 'taxi', 'cab'], categoryKey: 'transport', subcategoryKey: 'transport.cabs' },
  { words: ['petrol', 'diesel', 'fuel'], categoryKey: 'transport', subcategoryKey: 'transport.fuel' },
  { words: ['fastag', 'toll'], categoryKey: 'transport', subcategoryKey: 'transport.tolls' },
  { words: ['flight', 'indigo', 'airline'], categoryKey: 'travel', subcategoryKey: 'travel.flights' },
  { words: ['irctc', 'train'], categoryKey: 'travel', subcategoryKey: 'travel.trains' },
  { words: ['hotel', 'airbnb', 'oyo'], categoryKey: 'travel', subcategoryKey: 'travel.hotels' },
  { words: ['amazon', 'flipkart', 'myntra'], categoryKey: 'shopping' },
  { words: ['rent', 'landlord'], categoryKey: 'bills', subcategoryKey: 'bills.rent' },
  { words: ['electricity', 'power', 'bescom'], categoryKey: 'bills', subcategoryKey: 'bills.electricity' },
  { words: ['recharge', 'airtel', 'jio', 'postpaid'], categoryKey: 'bills', subcategoryKey: 'bills.mobile' },
  { words: ['wifi', 'broadband', 'internet'], categoryKey: 'bills', subcategoryKey: 'bills.internet' },
  { words: ['netflix', 'hotstar', 'prime', 'streaming'], categoryKey: 'subscriptions', subcategoryKey: 'subscriptions.streaming' },
  { words: ['spotify', 'music'], categoryKey: 'subscriptions', subcategoryKey: 'subscriptions.music' },
  { words: ['pharmacy', 'medicine', 'apollo', 'medplus'], categoryKey: 'health', subcategoryKey: 'health.medicines' },
  { words: ['gym', 'cult'], categoryKey: 'fitness', subcategoryKey: 'fitness.gym' },
  { words: ['movie', 'cinema', 'bookmyshow'], categoryKey: 'entertainment', subcategoryKey: 'entertainment.movies' },
  { words: ['school', 'tuition'], categoryKey: 'education', subcategoryKey: 'education.school' },
  { words: ['sip', 'mutual fund', 'zerodha', 'groww'], categoryKey: 'investments', subcategoryKey: 'investments.mutual_funds' },
  { words: ['premium', 'lic'], categoryKey: 'insurance', subcategoryKey: 'insurance.life' },
  { words: ['atm', 'withdrawal'], categoryKey: 'cash' },
  { words: ['salary', 'payroll'], categoryKey: 'salary', subcategoryKey: 'salary.salary' },
  { words: ['interest'], categoryKey: 'interest' },
  { words: ['dividend'], categoryKey: 'dividends' },
];

export interface CategorySearchResult extends CategoryPick {
  label: string;
  /** "Category", "Sub-category", "Category, no sub-categories". */
  hint: string;
  /** The everyday word that matched, when a synonym did. */
  hintWord?: string;
}

const MAX_RESULTS = 7;

/** Finds categories, sub-categories and everyday words for the text typed; nothing for blank text. */
export function searchCategories(list: readonly CategoryDef[], direction: PickerDirection, text: string): CategorySearchResult[] {
  const v = text.trim().toLowerCase();
  if (!v) return [];
  const offered = categoriesForDirection(list, direction);
  const out: CategorySearchResult[] = [];
  const add = (r: CategorySearchResult) => {
    if (!out.some((o) => o.categoryKey === r.categoryKey && o.subcategoryKey === r.subcategoryKey)) out.push(r);
  };
  for (const s of SYNONYMS) {
    const word = s.words.find((w) => w.startsWith(v) || (v.length >= 3 && w.includes(v)));
    if (!word) continue;
    const category = findCategory(offered, s.categoryKey);
    if (!category) continue;
    const sub = findSub(category, s.subcategoryKey);
    if (s.subcategoryKey && (!sub || !subsForDirection(category, direction).includes(sub))) continue;
    add({ categoryKey: category.key, subcategoryKey: sub?.key ?? null, label: categoryLabel(category.name, sub?.name), hint: '', hintWord: word });
  }
  for (const c of offered) {
    const subs = subsForDirection(c, direction);
    if (c.name.toLowerCase().includes(v)) {
      add({ categoryKey: c.key, subcategoryKey: null, label: c.name, hint: subs.length ? 'Category' : 'Category, no sub-categories' });
    }
    for (const s of subs) {
      if (s.name.toLowerCase().includes(v)) add({ categoryKey: c.key, subcategoryKey: s.key, label: categoryLabel(c.name, s.name), hint: 'Sub-category' });
    }
  }
  return out.slice(0, MAX_RESULTS);
}

import {
  BarChart3,
  CreditCard,
  TrendingUp,
  Wallet,
} from 'lucide-react';

export const SUGGESTIONS = [
  {
    title: 'Spend Analysis',
    prompt: 'What was my total spend last month by category?',
    icon: BarChart3,
  },
  {
    title: 'Card Recommendation',
    prompt: 'Which credit card gives the best rewards for ₹5,000 dining?',
    icon: CreditCard,
  },
  {
    title: 'Net Worth Summary',
    prompt: 'Show my current net worth breakdown across all accounts.',
    icon: Wallet,
  },
  {
    title: 'Portfolio Holdings',
    prompt: 'Summarize my top investment holdings and total valuation.',
    icon: TrendingUp,
  },
];

export interface ChatStarter {
  category: string;
  prompt: string;
}

/** The six starter questions on a new chat. */
export const STARTERS: ChatStarter[] = [
  { category: 'Spending', prompt: 'What was my total spend last month by category?' },
  { category: 'Cards', prompt: 'Which credit card gives the best rewards for ₹5,000 dining?' },
  { category: 'Net worth', prompt: 'Show my current net worth breakdown across all accounts.' },
  { category: 'Investments', prompt: 'Summarize my top investment holdings and total valuation.' },
  { category: 'Lending', prompt: 'Who still owes me money, and how much?' },
  { category: 'Reports', prompt: 'Make a report of my monthly spend by category.' },
];

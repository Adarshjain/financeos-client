import type { CategoryDef } from '@/lib/categoryList.types';

/** The fixed category list as GET /category-list returns it (generated from the server's taxonomy.json): for stories and tests. */
export const CATEGORY_LIST_FIXTURE: CategoryDef[] = [
  {
    key: 'food', name: 'Food', direction: 'OUT', icon: 'cat-fork-knife', outOrder: 1, inOrder: null, excludedByDefault: false,
    subs: [
      { key: 'food.dining', name: 'Dining', direction: 'OUT', sortOrder: 1 },
      { key: 'food.delivery', name: 'Delivery', direction: 'OUT', sortOrder: 2 },
      { key: 'food.cafes', name: 'Cafés', direction: 'OUT', sortOrder: 3 },
      { key: 'food.drinks', name: 'Drinks', direction: 'OUT', sortOrder: 4 },
      { key: 'food.snacks', name: 'Snacks', direction: 'OUT', sortOrder: 5 },
    ],
  },
  {
    key: 'groceries', name: 'Groceries', direction: 'OUT', icon: 'cat-shopping-cart', outOrder: 2, inOrder: null, excludedByDefault: false,
    subs: [
      { key: 'groceries.supermarket', name: 'Supermarket', direction: 'OUT', sortOrder: 1 },
      { key: 'groceries.fruits_veg', name: 'Fruits & veg', direction: 'OUT', sortOrder: 2 },
      { key: 'groceries.meat_fish', name: 'Meat & fish', direction: 'OUT', sortOrder: 3 },
      { key: 'groceries.dairy', name: 'Dairy', direction: 'OUT', sortOrder: 4 },
      { key: 'groceries.bakery', name: 'Bakery', direction: 'OUT', sortOrder: 5 },
      { key: 'groceries.household', name: 'Household', direction: 'OUT', sortOrder: 6 },
    ],
  },
  {
    key: 'transport', name: 'Transport', direction: 'OUT', icon: 'cat-taxi', outOrder: 3, inOrder: null, excludedByDefault: false,
    subs: [
      { key: 'transport.cabs', name: 'Cabs', direction: 'OUT', sortOrder: 1 },
      { key: 'transport.autos', name: 'Autos', direction: 'OUT', sortOrder: 2 },
      { key: 'transport.metro', name: 'Metro', direction: 'OUT', sortOrder: 3 },
      { key: 'transport.local_bus', name: 'Local bus', direction: 'OUT', sortOrder: 4 },
      { key: 'transport.fuel', name: 'Fuel', direction: 'OUT', sortOrder: 5 },
      { key: 'transport.parking', name: 'Parking', direction: 'OUT', sortOrder: 6 },
      { key: 'transport.tolls', name: 'Tolls', direction: 'OUT', sortOrder: 7 },
      { key: 'transport.vehicle_service', name: 'Vehicle service', direction: 'OUT', sortOrder: 8 },
      { key: 'transport.fines', name: 'Fines', direction: 'OUT', sortOrder: 9 },
    ],
  },
  {
    key: 'travel', name: 'Travel', direction: 'OUT', icon: 'cat-airplane-tilt', outOrder: 4, inOrder: null, excludedByDefault: false,
    subs: [
      { key: 'travel.flights', name: 'Flights', direction: 'OUT', sortOrder: 1 },
      { key: 'travel.trains', name: 'Trains', direction: 'OUT', sortOrder: 2 },
      { key: 'travel.buses', name: 'Buses', direction: 'OUT', sortOrder: 3 },
      { key: 'travel.hotels', name: 'Hotels', direction: 'OUT', sortOrder: 4 },
      { key: 'travel.activities', name: 'Activities', direction: 'OUT', sortOrder: 5 },
      { key: 'travel.visa', name: 'Visa', direction: 'OUT', sortOrder: 6 },
    ],
  },
  {
    key: 'shopping', name: 'Shopping', direction: 'OUT', icon: 'cat-shopping-bag', outOrder: 5, inOrder: null, excludedByDefault: false,
    subs: [
      { key: 'shopping.general', name: 'General', direction: 'OUT', sortOrder: 1 },
      { key: 'shopping.clothes', name: 'Clothes', direction: 'OUT', sortOrder: 2 },
      { key: 'shopping.electronics', name: 'Electronics', direction: 'OUT', sortOrder: 3 },
      { key: 'shopping.home', name: 'Home', direction: 'OUT', sortOrder: 4 },
      { key: 'shopping.beauty', name: 'Beauty', direction: 'OUT', sortOrder: 5 },
      { key: 'shopping.books', name: 'Books', direction: 'OUT', sortOrder: 6 },
      { key: 'shopping.jewellery', name: 'Jewellery', direction: 'OUT', sortOrder: 7 },
      { key: 'shopping.kids', name: 'Kids', direction: 'OUT', sortOrder: 8 },
      { key: 'shopping.eyewear', name: 'Eyewear', direction: 'OUT', sortOrder: 9 },
    ],
  },
  {
    key: 'bills', name: 'Bills', direction: 'OUT', icon: 'cat-receipt', outOrder: 6, inOrder: null, excludedByDefault: false,
    subs: [
      { key: 'bills.rent', name: 'Rent', direction: 'OUT', sortOrder: 1 },
      { key: 'bills.maintenance', name: 'Maintenance', direction: 'OUT', sortOrder: 2 },
      { key: 'bills.electricity', name: 'Electricity', direction: 'OUT', sortOrder: 3 },
      { key: 'bills.water', name: 'Water', direction: 'OUT', sortOrder: 4 },
      { key: 'bills.gas', name: 'Gas', direction: 'OUT', sortOrder: 5 },
      { key: 'bills.mobile', name: 'Mobile', direction: 'OUT', sortOrder: 6 },
      { key: 'bills.internet', name: 'Internet', direction: 'OUT', sortOrder: 7 },
      { key: 'bills.tv', name: 'TV', direction: 'OUT', sortOrder: 8 },
      { key: 'bills.house_help', name: 'House help', direction: 'OUT', sortOrder: 9 },
    ],
  },
  {
    key: 'subscriptions', name: 'Subscriptions', direction: 'OUT', icon: 'cat-repeat', outOrder: 7, inOrder: null, excludedByDefault: false,
    subs: [
      { key: 'subscriptions.streaming', name: 'Streaming', direction: 'OUT', sortOrder: 1 },
      { key: 'subscriptions.music', name: 'Music', direction: 'OUT', sortOrder: 2 },
      { key: 'subscriptions.software', name: 'Software', direction: 'OUT', sortOrder: 3 },
      { key: 'subscriptions.cloud', name: 'Cloud', direction: 'OUT', sortOrder: 4 },
      { key: 'subscriptions.news', name: 'News', direction: 'OUT', sortOrder: 5 },
      { key: 'subscriptions.memberships', name: 'Memberships', direction: 'OUT', sortOrder: 6 },
    ],
  },
  {
    key: 'health', name: 'Health', direction: 'OUT', icon: 'cat-first-aid-kit', outOrder: 8, inOrder: null, excludedByDefault: false,
    subs: [
      { key: 'health.doctor', name: 'Doctor', direction: 'OUT', sortOrder: 1 },
      { key: 'health.hospital', name: 'Hospital', direction: 'OUT', sortOrder: 2 },
      { key: 'health.medicines', name: 'Medicines', direction: 'OUT', sortOrder: 3 },
      { key: 'health.lab_tests', name: 'Lab tests', direction: 'OUT', sortOrder: 4 },
      { key: 'health.dental', name: 'Dental', direction: 'OUT', sortOrder: 5 },
      { key: 'health.eye_care', name: 'Eye care', direction: 'OUT', sortOrder: 6 },
    ],
  },
  {
    key: 'fitness', name: 'Fitness', direction: 'OUT', icon: 'cat-barbell', outOrder: 9, inOrder: null, excludedByDefault: false,
    subs: [
      { key: 'fitness.gym', name: 'Gym', direction: 'OUT', sortOrder: 1 },
      { key: 'fitness.sports', name: 'Sports', direction: 'OUT', sortOrder: 2 },
      { key: 'fitness.classes', name: 'Classes', direction: 'OUT', sortOrder: 3 },
      { key: 'fitness.equipment', name: 'Equipment', direction: 'OUT', sortOrder: 4 },
      { key: 'fitness.nutrition', name: 'Nutrition', direction: 'OUT', sortOrder: 5 },
    ],
  },
  {
    key: 'personal', name: 'Personal', direction: 'OUT', icon: 'cat-sparkle', outOrder: 10, inOrder: null, excludedByDefault: false,
    subs: [
      { key: 'personal.salon', name: 'Salon', direction: 'OUT', sortOrder: 1 },
      { key: 'personal.spa', name: 'Spa', direction: 'OUT', sortOrder: 2 },
      { key: 'personal.hobbies', name: 'Hobbies', direction: 'OUT', sortOrder: 3 },
      { key: 'personal.therapy', name: 'Therapy', direction: 'OUT', sortOrder: 4 },
      { key: 'personal.vices', name: 'Vices', direction: 'OUT', sortOrder: 5 },
    ],
  },
  {
    key: 'services', name: 'Services', direction: 'OUT', icon: 'cat-wrench', outOrder: 11, inOrder: null, excludedByDefault: false,
    subs: [
      { key: 'services.laundry', name: 'Laundry', direction: 'OUT', sortOrder: 1 },
      { key: 'services.repairs', name: 'Repairs', direction: 'OUT', sortOrder: 2 },
      { key: 'services.cleaning', name: 'Cleaning', direction: 'OUT', sortOrder: 3 },
      { key: 'services.courier', name: 'Courier', direction: 'OUT', sortOrder: 4 },
      { key: 'services.printing', name: 'Printing', direction: 'OUT', sortOrder: 5 },
      { key: 'services.professional', name: 'Professional', direction: 'OUT', sortOrder: 6 },
      { key: 'services.government', name: 'Government', direction: 'OUT', sortOrder: 7 },
    ],
  },
  {
    key: 'entertainment', name: 'Entertainment', direction: 'OUT', icon: 'cat-film-slate', outOrder: 12, inOrder: null, excludedByDefault: false,
    subs: [
      { key: 'entertainment.movies', name: 'Movies', direction: 'OUT', sortOrder: 1 },
      { key: 'entertainment.events', name: 'Events', direction: 'OUT', sortOrder: 2 },
      { key: 'entertainment.gaming', name: 'Gaming', direction: 'OUT', sortOrder: 3 },
      { key: 'entertainment.outings', name: 'Outings', direction: 'OUT', sortOrder: 4 },
    ],
  },
  {
    key: 'education', name: 'Education', direction: 'OUT', icon: 'cat-graduation-cap', outOrder: 13, inOrder: null, excludedByDefault: false,
    subs: [
      { key: 'education.school', name: 'School', direction: 'OUT', sortOrder: 1 },
      { key: 'education.college', name: 'College', direction: 'OUT', sortOrder: 2 },
      { key: 'education.courses', name: 'Courses', direction: 'OUT', sortOrder: 3 },
      { key: 'education.coaching', name: 'Coaching', direction: 'OUT', sortOrder: 4 },
      { key: 'education.exams', name: 'Exams', direction: 'OUT', sortOrder: 5 },
    ],
  },
  {
    key: 'pets', name: 'Pets', direction: 'OUT', icon: 'cat-paw-print', outOrder: 14, inOrder: null, excludedByDefault: false,
    subs: [
      { key: 'pets.pet_food', name: 'Pet food', direction: 'OUT', sortOrder: 1 },
      { key: 'pets.vet', name: 'Vet', direction: 'OUT', sortOrder: 2 },
      { key: 'pets.pet_care', name: 'Pet care', direction: 'OUT', sortOrder: 3 },
    ],
  },
  {
    key: 'family', name: 'Family', direction: 'OUT', icon: 'cat-users-three', outOrder: 15, inOrder: null, excludedByDefault: false,
    subs: [
      { key: 'family.parents', name: 'Parents', direction: 'OUT', sortOrder: 1 },
      { key: 'family.spouse', name: 'Spouse', direction: 'OUT', sortOrder: 2 },
      { key: 'family.kids', name: 'Kids', direction: 'OUT', sortOrder: 3 },
      { key: 'family.pocket_money', name: 'Pocket money', direction: 'OUT', sortOrder: 4 },
    ],
  },
  {
    key: 'gifts', name: 'Gifts', direction: 'BOTH', icon: 'gift', outOrder: 16, inOrder: 8, excludedByDefault: false,
    subs: [],
  },
  {
    key: 'donations', name: 'Donations', direction: 'OUT', icon: 'cat-hand-heart', outOrder: 17, inOrder: null, excludedByDefault: false,
    subs: [
      { key: 'donations.charity', name: 'Charity', direction: 'OUT', sortOrder: 1 },
      { key: 'donations.religious', name: 'Religious', direction: 'OUT', sortOrder: 2 },
    ],
  },
  {
    key: 'emi', name: 'EMI', direction: 'OUT', icon: 'cat-bank', outOrder: 18, inOrder: null, excludedByDefault: false,
    subs: [
      { key: 'emi.home_loan', name: 'Home loan', direction: 'OUT', sortOrder: 1 },
      { key: 'emi.car_loan', name: 'Car loan', direction: 'OUT', sortOrder: 2 },
      { key: 'emi.bike_loan', name: 'Bike loan', direction: 'OUT', sortOrder: 3 },
      { key: 'emi.personal_loan', name: 'Personal loan', direction: 'OUT', sortOrder: 4 },
      { key: 'emi.education_loan', name: 'Education loan', direction: 'OUT', sortOrder: 5 },
      { key: 'emi.consumer_emi', name: 'Consumer EMI', direction: 'OUT', sortOrder: 6 },
    ],
  },
  {
    key: 'insurance', name: 'Insurance', direction: 'OUT', icon: 'cat-shield-check', outOrder: 19, inOrder: null, excludedByDefault: false,
    subs: [
      { key: 'insurance.health', name: 'Health', direction: 'OUT', sortOrder: 1 },
      { key: 'insurance.life', name: 'Life', direction: 'OUT', sortOrder: 2 },
      { key: 'insurance.vehicle', name: 'Vehicle', direction: 'OUT', sortOrder: 3 },
      { key: 'insurance.home', name: 'Home', direction: 'OUT', sortOrder: 4 },
      { key: 'insurance.travel', name: 'Travel', direction: 'OUT', sortOrder: 5 },
    ],
  },
  {
    key: 'taxes', name: 'Taxes', direction: 'OUT', icon: 'cat-scales', outOrder: 20, inOrder: null, excludedByDefault: false,
    subs: [
      { key: 'taxes.income_tax', name: 'Income tax', direction: 'OUT', sortOrder: 1 },
      { key: 'taxes.property_tax', name: 'Property tax', direction: 'OUT', sortOrder: 2 },
      { key: 'taxes.gst', name: 'GST', direction: 'OUT', sortOrder: 3 },
    ],
  },
  {
    key: 'investments', name: 'Investments', direction: 'OUT', icon: 'chart-line-up', outOrder: 21, inOrder: null, excludedByDefault: false,
    subs: [
      { key: 'investments.mutual_funds', name: 'Mutual funds', direction: 'OUT', sortOrder: 1 },
      { key: 'investments.stocks', name: 'Stocks', direction: 'OUT', sortOrder: 2 },
      { key: 'investments.fixed_deposit', name: 'Fixed deposit', direction: 'OUT', sortOrder: 3 },
      { key: 'investments.recurring_deposit', name: 'Recurring deposit', direction: 'OUT', sortOrder: 4 },
      { key: 'investments.ppf', name: 'PPF', direction: 'OUT', sortOrder: 5 },
      { key: 'investments.nps', name: 'NPS', direction: 'OUT', sortOrder: 6 },
      { key: 'investments.gold', name: 'Gold', direction: 'OUT', sortOrder: 7 },
      { key: 'investments.bonds', name: 'Bonds', direction: 'OUT', sortOrder: 8 },
      { key: 'investments.crypto', name: 'Crypto', direction: 'OUT', sortOrder: 9 },
    ],
  },
  {
    key: 'savings', name: 'Savings', direction: 'OUT', icon: 'cat-piggy-bank', outOrder: 22, inOrder: null, excludedByDefault: false,
    subs: [],
  },
  {
    key: 'lent', name: 'Lent', direction: 'OUT', icon: 'cat-hand-coins', outOrder: 23, inOrder: null, excludedByDefault: false,
    subs: [],
  },
  {
    key: 'repaid', name: 'Repaid', direction: 'BOTH', icon: 'cat-arrow-counter-clockwise', outOrder: 24, inOrder: 10, excludedByDefault: false,
    subs: [],
  },
  {
    key: 'cash', name: 'Cash', direction: 'OUT', icon: 'cat-money', outOrder: 25, inOrder: null, excludedByDefault: false,
    subs: [],
  },
  {
    key: 'fees', name: 'Fees', direction: 'OUT', icon: 'cat-coins', outOrder: 26, inOrder: null, excludedByDefault: false,
    subs: [
      { key: 'fees.bank_charges', name: 'Bank charges', direction: 'OUT', sortOrder: 1 },
      { key: 'fees.card_fees', name: 'Card fees', direction: 'OUT', sortOrder: 2 },
      { key: 'fees.late_fees', name: 'Late fees', direction: 'OUT', sortOrder: 3 },
      { key: 'fees.interest', name: 'Interest', direction: 'OUT', sortOrder: 4 },
      { key: 'fees.forex_markup', name: 'Forex markup', direction: 'OUT', sortOrder: 5 },
    ],
  },
  {
    key: 'self_transfer', name: 'Self transfer', direction: 'BOTH', icon: 'cat-arrows-left-right', outOrder: 27, inOrder: 12, excludedByDefault: true,
    subs: [],
  },
  {
    key: 'card_bill', name: 'Card bill', direction: 'BOTH', icon: 'cat-credit-card', outOrder: 28, inOrder: 13, excludedByDefault: true,
    subs: [
      { key: 'card_bill.credit_card', name: 'Credit card', direction: 'OUT', sortOrder: 1 },
      { key: 'card_bill.pay_later', name: 'Pay later', direction: 'OUT', sortOrder: 2 },
    ],
  },
  {
    key: 'top_up', name: 'Top-up', direction: 'OUT', icon: 'wallet', outOrder: 29, inOrder: null, excludedByDefault: true,
    subs: [
      { key: 'top_up.upi_lite', name: 'UPI Lite', direction: 'OUT', sortOrder: 1 },
      { key: 'top_up.wallet', name: 'Wallet', direction: 'OUT', sortOrder: 2 },
      { key: 'top_up.gift_card', name: 'Gift card', direction: 'OUT', sortOrder: 3 },
    ],
  },
  {
    key: 'other', name: 'Other', direction: 'BOTH', icon: 'cat-dots-three-outline', outOrder: 30, inOrder: 14, excludedByDefault: false,
    subs: [
      { key: 'other.verification', name: 'Verification', direction: 'BOTH', sortOrder: 1 },
      { key: 'other.tips', name: 'Tips', direction: 'OUT', sortOrder: 2 },
      { key: 'other.forex', name: 'Forex', direction: 'OUT', sortOrder: 3 },
    ],
  },
  {
    key: 'salary', name: 'Salary', direction: 'IN', icon: 'cat-briefcase', outOrder: null, inOrder: 1, excludedByDefault: false,
    subs: [
      { key: 'salary.salary', name: 'Salary', direction: 'IN', sortOrder: 1 },
      { key: 'salary.bonus', name: 'Bonus', direction: 'IN', sortOrder: 2 },
      { key: 'salary.reimbursement', name: 'Reimbursement', direction: 'IN', sortOrder: 3 },
    ],
  },
  {
    key: 'earnings', name: 'Earnings', direction: 'IN', icon: 'cat-storefront', outOrder: null, inOrder: 2, excludedByDefault: false,
    subs: [
      { key: 'earnings.freelance', name: 'Freelance', direction: 'IN', sortOrder: 1 },
      { key: 'earnings.business', name: 'Business', direction: 'IN', sortOrder: 2 },
      { key: 'earnings.rent', name: 'Rent', direction: 'IN', sortOrder: 3 },
    ],
  },
  {
    key: 'interest', name: 'Interest', direction: 'IN', icon: 'cat-percent', outOrder: null, inOrder: 3, excludedByDefault: false,
    subs: [
      { key: 'interest.savings_account', name: 'Savings account', direction: 'IN', sortOrder: 1 },
      { key: 'interest.deposits', name: 'Deposits', direction: 'IN', sortOrder: 2 },
      { key: 'interest.bonds', name: 'Bonds', direction: 'IN', sortOrder: 3 },
    ],
  },
  {
    key: 'dividends', name: 'Dividends', direction: 'IN', icon: 'cat-chart-pie-slice', outOrder: null, inOrder: 4, excludedByDefault: false,
    subs: [],
  },
  {
    key: 'redemption', name: 'Redemption', direction: 'IN', icon: 'cat-arrow-circle-down', outOrder: null, inOrder: 5, excludedByDefault: false,
    subs: [
      { key: 'redemption.mutual_funds', name: 'Mutual funds', direction: 'IN', sortOrder: 1 },
      { key: 'redemption.stocks', name: 'Stocks', direction: 'IN', sortOrder: 2 },
      { key: 'redemption.deposits', name: 'Deposits', direction: 'IN', sortOrder: 3 },
      { key: 'redemption.insurance_payout', name: 'Insurance payout', direction: 'IN', sortOrder: 4 },
    ],
  },
  {
    key: 'refund', name: 'Refund', direction: 'IN', icon: 'cat-arrow-u-up-left', outOrder: null, inOrder: 6, excludedByDefault: false,
    subs: [],
  },
  {
    key: 'cashback', name: 'Cashback', direction: 'IN', icon: 'cat-confetti', outOrder: null, inOrder: 7, excludedByDefault: false,
    subs: [
      { key: 'cashback.card_cashback', name: 'Card cashback', direction: 'IN', sortOrder: 1 },
      { key: 'cashback.app_cashback', name: 'App cashback', direction: 'IN', sortOrder: 2 },
    ],
  },
  {
    key: 'borrowed', name: 'Borrowed', direction: 'IN', icon: 'cat-hand-arrow-down', outOrder: null, inOrder: 9, excludedByDefault: false,
    subs: [],
  },
  {
    key: 'cash_deposit', name: 'Cash deposit', direction: 'IN', icon: 'cat-money', outOrder: null, inOrder: 11, excludedByDefault: false,
    subs: [],
  },
];

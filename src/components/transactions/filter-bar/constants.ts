export const DATE_PRESETS = [
  { label: 'All Time', value: 'all_time' },
  { label: 'This Month', value: 'this_month' },
  { label: 'Last Month', value: 'previous_month' },
  { label: 'This Week', value: 'this_week' },
  { label: 'Last Week', value: 'previous_week' },
  { label: 'This Year', value: 'this_year' },
  { label: 'Today', value: 'today' },
  { label: 'Yesterday', value: 'yesterday' },
  { label: 'Current FY', value: 'current_fy' },
  { label: 'Prev FY', value: 'prev_fy' },
];

export const SOURCE_OPTIONS = [
  { label: 'Gmail Alert', value: 'gmail_transaction_alert' },
  { label: 'Gmail Statement', value: 'gmail_statement' },
  { label: 'Manual', value: 'manual' },
  { label: 'File Upload', value: 'file_upload' },
];

export const ACCOUNT_TYPE_OPTIONS = [
  { label: 'Bank Account', value: 'bank_account' },
  { label: 'Credit Card', value: 'credit_card' },
  { label: 'Broker', value: 'broker' },
  { label: 'Generic', value: 'generic' },
];

export const REVIEW_TYPE_OPTIONS = [
  { label: 'Needs Review', value: 'NEEDS_REVIEW' },
  { label: 'Auto Reviewed', value: 'AUTO_REVIEWED' },
  { label: 'Manually Reviewed', value: 'MANUALLY_REVIEWED' },
  { label: 'N/A', value: 'NA' },
];

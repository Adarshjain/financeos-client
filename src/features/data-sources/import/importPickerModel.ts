import { appHref } from '@/features/shell/routes';

export interface ImportKindRow {
  id: 'statement' | 'broker' | 'epf' | 'nps';
  title: string;
  subtitle: string;
  href: string;
}

/** Where /import goes back to when it was not opened from another page. */
export const IMPORT_BACK_HREF = appHref('/transactions');

/** The kinds of file you can import, each leading to the page that takes it. */
export const importKindRows: ImportKindRow[] = [
  {
    id: 'statement',
    title: 'Bank or card statement',
    subtitle: 'PDF, XLSX or XLS from your bank',
    href: appHref('/transactions/import'),
  },
  {
    id: 'broker',
    title: 'Broker tradebook or CAS',
    subtitle: 'Zerodha, Groww and mutual-fund CAS',
    href: appHref('/investments/import'),
  },
  {
    id: 'epf',
    title: 'EPF passbook',
    subtitle: 'EPFO passbook PDFs',
    href: appHref('/investments/import?type=epf'),
  },
  {
    id: 'nps',
    title: 'NPS statement',
    subtitle: 'NPS statement PDFs',
    href: appHref('/investments/import?type=nps'),
  },
];

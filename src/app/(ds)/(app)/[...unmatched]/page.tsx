import { notFound } from 'next/navigation';

/** Any address no route claims: renders the app's not-found page inside the Dinero shell (follows the theme). */
export default function UnmatchedPage(): never {
  notFound();
}

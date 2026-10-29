import { crumbMap } from './navigation';

const SEP = ' / ';

/** The crumb without a trailing segment that repeats the page title ("Inbox / Notifications" over "Notifications" reads "Inbox"). */
export function trimCrumb<C>(crumb: C, title: unknown): C {
  if (typeof crumb !== 'string' || typeof title !== 'string') return crumb;
  const segments = crumb.split(SEP);
  while (segments.length > 0 && segments[segments.length - 1] === title) segments.pop();
  return (segments.length > 0 ? segments.join(SEP) : undefined) as C;
}

/**
 * Where the back arrow of a page below a list goes, from its crumb depth alone: a crumb of two or more
 * segments ("Money / Accounts", "Money / Transactions / Import") sits below the list named by its second segment.
 * Undefined for a one-segment crumb (a list or a single-page area) or an unknown list.
 */
export function crumbParentHref(crumb: unknown): string | undefined {
  if (typeof crumb !== 'string') return undefined;
  const [group, label] = crumb.split(SEP);
  if (label === undefined) return undefined;
  const entry = Object.values(crumbMap).find((e) => e.group === group && e.label === label);
  return entry?.href;
}

/** The drill-in sections of a one-column area (Settings, Data sources): the area's own page lists them, each is its own page. */
export interface AreaSection<Id extends string = string> {
  id: Id;
  /** The row label on the area's own page, and the top-bar title on that section. */
  label: string;
  href: string;
}

function clean(pathname: string | null | undefined): string {
  return (pathname ?? '').replace(/\/+$/, '');
}

/** True on the area's own page (`/settings`). */
export function isAreaIndex(indexHref: string, pathname: string | null | undefined): boolean {
  return clean(pathname) === indexHref;
}

/** The section a pathname belongs to; undefined on the area's own page and unknown paths. */
export function activeAreaSection<S extends AreaSection>(sections: S[], pathname: string | null | undefined): S | undefined {
  const path = clean(pathname);
  return sections.find((s) => path === s.href || path.startsWith(`${s.href}/`));
}

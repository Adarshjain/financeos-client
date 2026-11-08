/** The Data sources drill-in sections, listed on the Settings page; each section is its own page under `/data-sources`. */
import { activeAreaSection, type AreaSection, isAreaIndex } from '@/features/shell/areaSections';
import { appHref } from '@/features/shell/routes';

export type DataSourcesSectionId = 'connections' | 'imports' | 'sync';

export type DataSourcesSection = AreaSection<DataSourcesSectionId>;

/** The path the sections live under; `/data-sources` itself redirects to Settings, so this is not a page link. */
export const DATA_SOURCES_HREF = '/data-sources';

const section = (id: DataSourcesSectionId, label: string): DataSourcesSection => ({
  id,
  label,
  href: appHref(`${DATA_SOURCES_HREF}/${id}`),
});

export const dataSourcesSections: DataSourcesSection[] = [
  section('connections', 'Connections'),
  section('imports', 'Imports'),
  section('sync', 'Sync health'),
];

/** The section by id, for the main page's rows. */
export function dataSourcesSection(id: DataSourcesSectionId): DataSourcesSection {
  return dataSourcesSections.find((s) => s.id === id)!;
}

/** True on `/data-sources` itself. */
export function isDataSourcesIndex(pathname: string | null | undefined): boolean {
  return isAreaIndex(DATA_SOURCES_HREF, pathname);
}

/** The section a pathname belongs to; undefined on `/data-sources` and unknown paths. */
export function activeDataSourcesSection(pathname: string | null | undefined): DataSourcesSection | undefined {
  return activeAreaSection(dataSourcesSections, pathname);
}

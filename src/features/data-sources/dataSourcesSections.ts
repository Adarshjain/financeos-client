/** The Data sources drill-in sections. `/data-sources` itself is the main page; each section is its own page. */
import { activeAreaSection, type AreaSection, isAreaIndex } from '@/features/shell/areaSections';
import { appHref } from '@/features/shell/routes';

export type DataSourcesSectionId = 'connections' | 'imports' | 'sync';

export type DataSourcesSection = AreaSection<DataSourcesSectionId>;

export const DATA_SOURCES_HREF = appHref('/data-sources');

const section = (id: DataSourcesSectionId, label: string): DataSourcesSection => ({
  id,
  label,
  href: `${DATA_SOURCES_HREF}/${id}`,
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

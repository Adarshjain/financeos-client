import { api } from '@/lib/api/client';

/** The name a copy of a report gets. */
export const copyName = (name: string): string => `${name} (copy)`;

/** Copies a report: fetches it, then creates "<name> (copy)" with the same definition. Resolves with the copy. */
export async function duplicateReport(id: string) {
  const { data: src } = await api.GET('/api/v1/reports/{id}', {
    params: { path: { id } },
  });
  if (!src) throw new Error('Report not found');
  const res = await api.POST('/api/v1/reports', {
    body: {
      name: copyName(src.name),
      description: src.description,
      type: src.type,
      datasource: src.datasource,
      definition: src.definition,
    } as never,
  });
  if (res.error) throw res.error;
  return res.data;
}

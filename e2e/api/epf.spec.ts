import { expectStatus } from '../fixtures/api';
import { createEpfEmployer, createEpfEntry } from '../fixtures/seed/epf';
import { expectForeign, newUser, secondUser } from '../fixtures/tenancy';
import { expect, test } from '../fixtures/test';

const UNKNOWN = '00000000-0000-4000-8000-000000000000';

test.describe('EPF employers and entries API (@api)', () => {
  test('PUT employer edits the details and returns them, a blank name is refused, an unknown id is 404', async ({ request }) => {
    const { api } = await newUser(request, 'epf-employer-edit');
    const employer = await createEpfEmployer(api, { name: 'Acme Labs', joinedOn: '2020-06-01' });

    const res = await api.PUT('/api/v1/epf/employers/{id}', {
      params: { path: { id: employer.id } },
      body: { name: 'Acme Labs Pvt Ltd', memberId: 'MH/BAN/1234567/000/0000001', joinedOn: '2020-06-01', leftOn: '2024-03-31' },
    });
    expectStatus(res, 200);
    expect(res.data).toMatchObject({
      id: employer.id,
      name: 'Acme Labs Pvt Ltd',
      memberId: 'MH/BAN/1234567/000/0000001',
      joinedOn: '2020-06-01',
      leftOn: '2024-03-31',
    });

    const list = await api.GET('/api/v1/epf/employers');
    expectStatus(list, 200);
    expect(list.data!.find((e) => e.id === employer.id)).toMatchObject({ name: 'Acme Labs Pvt Ltd', leftOn: '2024-03-31' });

    const blank = await api.PUT('/api/v1/epf/employers/{id}', { params: { path: { id: employer.id } }, body: { name: ' ' } });
    expect(blank.response.status).toBe(400);

    const unknown = await api.PUT('/api/v1/epf/employers/{id}', { params: { path: { id: UNKNOWN } }, body: { name: 'Nobody' } });
    expect(unknown.response.status).toBe(404);
  });

  test('PUT employer: another user cannot edit it', async ({ request }) => {
    const { api } = await newUser(request, 'epf-employer-owner');
    const employer = await createEpfEmployer(api);
    const { api: other } = await secondUser(request, 'epf-employer-other');
    expect(await expectForeign(other, 'PUT', `/api/v1/epf/employers/${employer.id}`, { name: 'Hijacked' })).toBe(404);
    const list = await api.GET('/api/v1/epf/employers');
    expect(list.data!.find((e) => e.id === employer.id)?.name).toBe(employer.name);
  });

  test('GET entry returns one entry with its employer and running balance, 404 for an unknown or foreign id', async ({ request }) => {
    const { api } = await newUser(request, 'epf-entry-get');
    const employer = await createEpfEmployer(api, { name: 'Entry Co' });
    const entry = await createEpfEntry(api, {
      type: 'OPENING_BALANCE',
      employerId: employer.id,
      creditedOn: '2026-04-01',
      employeeAmount: 300000,
      employerAmount: 200000,
    });

    const res = await api.GET('/api/v1/epf/entries/{id}', { params: { path: { id: entry.id } } });
    expectStatus(res, 200);
    expect(res.data).toMatchObject({
      id: entry.id,
      employerId: employer.id,
      employerName: 'Entry Co',
      type: 'OPENING_BALANCE',
      creditedOn: '2026-04-01',
      employeeAmount: 300000,
      employerAmount: 200000,
    });
    expect(res.data!.runningBalance).toBe(500000);

    const unknown = await api.GET('/api/v1/epf/entries/{id}', { params: { path: { id: UNKNOWN } } });
    expect(unknown.response.status).toBe(404);
    const { api: other } = await secondUser(request, 'epf-entry-other');
    expect(await expectForeign(other, 'GET', `/api/v1/epf/entries/${entry.id}`)).toBe(404);
  });
});

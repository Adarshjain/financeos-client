import { catalog } from '../fixtures/seed/reports';
import { expectUnauthenticated } from '../fixtures/tenancy';
import { expect, test } from '../fixtures/test';

test.describe('Report Datasources API (@api)', () => {
  const EXPECTED_DATASOURCES = [
    'transactions',
    'investment_trades',
    'dividends',
    'fno_trades',
    'positions',
    'realized_lots',
    'portfolio_value',
    'loan_payments',
    'loan_tax_summary',
    'lendings',
    'reward_earnings',
  ];

  test('GET /report/datasource lists all 11 datasources in order with fields and operators catalog', async ({
    api,
  }) => {
    const data = await catalog(api);

    expect(data.datasources).toBeDefined();
    expect(data.datasources.length).toBe(11);

    const names = data.datasources.map((d) => d.name);
    expect(names).toEqual(EXPECTED_DATASOURCES);

    // Verify operator catalog
    expect(data.operators).toBeDefined();
    expect(data.operators.date.absolute).toContain('is');
    expect(data.operators.date.absolute).toContain('between');
    expect(data.operators.date.relative).toContain('this_month');
    expect(data.operators.date.relative).toContain('current_fy');
    expect(data.operators.date.relative).toContain('prev_fy');
    expect(data.operators.string).toContain('exact');
    expect(data.operators.string).toContain('contains');
    expect(data.operators.number).toContain('equals');
    expect(data.operators.number).toContain('between');
    expect(data.operators.enum).toContain('is');
    expect(data.operators.enum).toContain('in');
    expect(data.operators.boolean).toContain('is');

    // Inspect each datasource for proper schema definition
    for (const ds of data.datasources) {
      expect(ds.name).toBeTruthy();
      expect(ds.label).toBeTruthy();
      expect(ds.fields.length).toBeGreaterThan(0);

      for (const field of ds.fields) {
        expect(field.name).toBeTruthy();
        expect(field.label).toBeTruthy();
        expect(['number', 'date', 'string', 'enum', 'boolean']).toContain(field.type);
        expect(['measure', 'dimension', 'filter']).toContain(field.role);
        expect(Array.isArray(field.allowedInReports)).toBe(true);

        if (field.role === 'measure') {
          expect(Array.isArray(field.aggregations)).toBe(true);
          expect(field.aggregations!.length).toBeGreaterThan(0);
        }
      }
    }

    // Dynamic dimension verification
    const txnDs = data.datasources.find((d) => d.name === 'transactions')!;
    const catField = txnDs.fields.find((f) => f.name === 'category');
    expect(catField?.dynamic).toBe(true);
    const accField = txnDs.fields.find((f) => f.name === 'account');
    expect(accField?.dynamic).toBe(true);

    // Date dimension presence check
    const dateField = txnDs.fields.find((f) => f.name === 'date');
    expect(dateField?.type).toBe('date');
    expect(dateField?.role).toBe('dimension');
  });

  test('GET /report/datasource requires authentication (401)', async () => {
    await expectUnauthenticated('GET', '/api/v1/report/datasource');
  });
});

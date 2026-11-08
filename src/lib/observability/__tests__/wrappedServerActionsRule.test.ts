import tsParser from '@typescript-eslint/parser';
import { type Rule, RuleTester } from 'eslint';
import { describe, it } from 'vitest';

import plugin from '../../../../eslint-rules/wrapped-server-actions.js';

RuleTester.describe = describe;
RuleTester.it = it;

const tester = new RuleTester({
  languageOptions: { parser: tsParser, ecmaVersion: 2022, sourceType: 'module' },
});

const error = (name: string) => ({ messageId: 'unwrapped' as const, data: { name } });

tester.run('wrapped-server-actions', plugin.rules['wrapped-server-actions'] as Rule.RuleModule, {
  valid: [
    `'use server';\nexport const a = action('x.a', createDomainAction({ fallbackError: 'f' }, async () => 1));`,
    `'use server';\nexport const a = action('x.a', async function a(id: string): Promise<void> {});`,
    `'use server';\nexport type T = string;\nexport interface I { a: 1 }\nasync function helper() {}`,
    `export async function notAServerFile() {}`,
    `import x from 'y';\nexport const c = 1;`,
  ],
  invalid: [
    { code: `'use server';\nexport async function a() {}`, errors: [error('a')] },
    { code: `'use server';\nexport const b = createDomainAction({ fallbackError: 'f' }, async () => 1);`, errors: [error('b')] },
    { code: `'use server';\nexport const c = async () => 1;`, errors: [error('c')] },
    {
      code: `"use server";\nexport const ok = action('x.ok', async () => 1);\nexport async function bad() {}`,
      errors: [error('bad')],
    },
  ],
});

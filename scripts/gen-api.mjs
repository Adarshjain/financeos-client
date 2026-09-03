#!/usr/bin/env node
/**
 * Regenerates `src/lib/api/schema.d.ts` from `src/lib/api/openapi.yaml`.
 *
 * This replaces a plain `openapi-typescript` CLI invocation with the
 * programmatic API so we can pass a `transform`: the CLI renders any
 * `{ type: "string", format: "binary" }` schema (i.e. every multipart file
 * part) as a plain `string`, which a real `FormData`/`File` can never satisfy
 * structurally. Rendering it as `Blob` instead makes the three multipart
 * request bodies (statement ingest, investment import preview, broker
 * reconcile preview) properly typed, since `File extends Blob`.
 *
 * Every other option is left at the library's defaults, matching the old
 * `openapi-typescript <input> -o <output>` command exactly, so this is a
 * no-op for every other type in the generated file.
 */
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import openapiTS, { astToString, COMMENT_HEADER } from 'openapi-typescript';
import ts from 'typescript';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.dirname(__dirname);
const inputPath = path.join(projectRoot, 'src/lib/api/openapi.yaml');
const outputPath = path.join(projectRoot, 'src/lib/api/schema.d.ts');

const ast = await openapiTS(new URL(`file://${inputPath}`), {
  transform(schemaObject) {
    if (schemaObject.format === 'binary') {
      return ts.factory.createTypeReferenceNode('Blob');
    }
    return undefined;
  },
});

const output = `${COMMENT_HEADER}${astToString(ast)}`;
writeFileSync(outputPath, output, 'utf8');

console.log(`Generated ${path.relative(projectRoot, outputPath)} from ${path.relative(projectRoot, inputPath)}`);

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import * as yaml from 'js-yaml';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'OPTIONS' | 'HEAD' | 'TRACE';

export interface Operation {
  method: HttpMethod;
  path: string;
}

export interface PathParam {
  name: string;
  format?: string;
}

const HTTP_METHODS = new Set(['get', 'post', 'put', 'delete', 'patch', 'options', 'head', 'trace']);

let cachedSpec: any = null;

export function loadSpec(): any {
  if (!cachedSpec) {
    const specPath = path.resolve(__dirname, '../../src/lib/api/openapi.yaml');
    const content = fs.readFileSync(specPath, 'utf8');
    cachedSpec = yaml.load(content);
  }
  return cachedSpec;
}

export function normalizePath(p: string): string {
  if (p.length > 1 && p.endsWith('/')) {
    return p.slice(0, -1);
  }
  return p;
}

export function loadOperations(): Operation[] {
  const spec = loadSpec();
  const operations: Operation[] = [];
  const paths = spec.paths || {};

  for (const [rawPath, pathItem] of Object.entries<any>(paths)) {
    const normPath = normalizePath(rawPath);
    if (!pathItem || typeof pathItem !== 'object') continue;

    for (const [key, operationObj] of Object.entries<any>(pathItem)) {
      if (HTTP_METHODS.has(key.toLowerCase()) && operationObj) {
        operations.push({
          method: key.toUpperCase() as HttpMethod,
          path: normPath,
        });
      }
    }
  }

  return operations;
}

export function pathParams(targetPath: string, specInput?: any): PathParam[] {
  const spec = specInput || loadSpec();
  const normTargetPath = normalizePath(targetPath);

  // Extract all {param} from the path
  const matches = [...normTargetPath.matchAll(/\{([^}]+)\}/g)];
  if (matches.length === 0) {
    return [];
  }

  // Find the matching path item in spec.paths
  let pathItem: any = null;
  for (const [p, item] of Object.entries<any>(spec.paths || {})) {
    if (normalizePath(p) === normTargetPath) {
      pathItem = item;
      break;
    }
  }

  return matches.map((match) => {
    const name = match[1];
    let format: string | undefined;

    // Check path-level parameters
    if (Array.isArray(pathItem?.parameters)) {
      const p = pathItem.parameters.find((param: any) => param.name === name && param.in === 'path');
      if (p?.schema?.format) {
        format = p.schema.format;
      }
    }

    // Check operation-level parameters if not found yet
    if (!format && pathItem) {
      for (const [key, op] of Object.entries<any>(pathItem)) {
        if (HTTP_METHODS.has(key.toLowerCase()) && Array.isArray(op?.parameters)) {
          const p = op.parameters.find((param: any) => param.name === name && param.in === 'path');
          if (p?.schema?.format) {
            format = p.schema.format;
            break;
          }
        }
      }
    }

    return { name, format };
  });
}

export interface RequestBodyInfo {
  hasBody: boolean;
  isMultipart: boolean;
}

export function getRequestBodyInfo(method: string, targetPath: string, specInput?: any): RequestBodyInfo {
  const spec = specInput || loadSpec();
  const normTargetPath = normalizePath(targetPath);

  let pathItem: any = null;
  for (const [p, item] of Object.entries<any>(spec.paths || {})) {
    if (normalizePath(p) === normTargetPath) {
      pathItem = item;
      break;
    }
  }

  const op = pathItem?.[method.toLowerCase()];
  if (op?.requestBody?.content) {
    const content = op.requestBody.content;
    if ('multipart/form-data' in content) {
      return { hasBody: true, isMultipart: true };
    }
    return { hasBody: true, isMultipart: false };
  }

  return { hasBody: false, isMultipart: false };
}

export function getRequiredQueryParams(method: string, targetPath: string, specInput?: any): Record<string, string> {
  const spec = specInput || loadSpec();
  const normTargetPath = normalizePath(targetPath);

  let pathItem: any = null;
  for (const [p, item] of Object.entries<any>(spec.paths || {})) {
    if (normalizePath(p) === normTargetPath) {
      pathItem = item;
      break;
    }
  }

  const op = pathItem?.[method.toLowerCase()];
  const allParams = [...(pathItem?.parameters || []), ...(op?.parameters || [])];
  const queryParams: Record<string, string> = {};

  for (const param of allParams) {
    if (param.in === 'query' && param.required) {
      const format = param.schema?.format;
      const type = param.schema?.type;
      if (format === 'date') {
        queryParams[param.name] = '2026-01-01';
      } else if (format === 'uuid') {
        queryParams[param.name] = '00000000-0000-0000-0000-000000000000';
      } else if (type === 'integer' || type === 'number') {
        queryParams[param.name] = '1';
      } else if (type === 'boolean') {
        queryParams[param.name] = 'true';
      } else {
        queryParams[param.name] = 'dummy';
      }
    }
  }

  return queryParams;
}


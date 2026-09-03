import { describe, expect, it } from 'vitest';

import { multipartBodySerializer } from '@/lib/api/multipart';

function fileNamed(name: string): File {
  return new File(['content'], name, { type: 'application/pdf' });
}

describe('multipartBodySerializer', () => {
  it('appends a single File as-is', () => {
    const file = fileNamed('statement.pdf');
    const fd = multipartBodySerializer({ file });

    expect(fd).toBeInstanceOf(FormData);
    expect(fd.getAll('file')).toEqual([file]);
  });

  it('appends each item of an array under repeated keys, preserving order', () => {
    const a = fileNamed('a.pdf');
    const b = fileNamed('b.pdf');
    const fd = multipartBodySerializer({ files: [a, b] });

    expect(fd.getAll('files')).toEqual([a, b]);
  });

  it('stringifies non-Blob primitives', () => {
    const fd = multipartBodySerializer({ brokerAccountId: 'acc-1', password: undefined, count: 3 });

    expect(fd.get('brokerAccountId')).toBe('acc-1');
    expect(fd.get('count')).toBe('3');
  });

  it('skips undefined and null entries entirely', () => {
    const fd = multipartBodySerializer({ holdingsFile: undefined, note: null });

    expect(fd.has('holdingsFile')).toBe(false);
    expect(fd.has('note')).toBe(false);
    expect(Array.from(fd.keys())).toHaveLength(0);
  });

  it('skips undefined/null items within an array without dropping the rest', () => {
    const a = fileNamed('a.pdf');
    const files: (File | undefined | null)[] = [a, undefined, null];
    const fd = multipartBodySerializer({ files });

    expect(fd.getAll('files')).toEqual([a]);
  });

  it('returns an empty FormData for an empty body', () => {
    const fd = multipartBodySerializer({});

    expect(Array.from(fd.keys())).toHaveLength(0);
  });

  it('returns an empty FormData when body is undefined (openapi-fetch calls it this way for an optional requestBody)', () => {
    const fd = multipartBodySerializer(undefined);

    expect(Array.from(fd.keys())).toHaveLength(0);
  });
});

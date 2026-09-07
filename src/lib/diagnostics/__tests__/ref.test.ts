import { describe, expect, it } from 'vitest';

import { isErrorId, isValidRef, refOf } from '@/lib/diagnostics/ref';

describe('ref utilities', () => {
  describe('isErrorId', () => {
    it('accepts 8 Crockford chars in uppercase or lowercase', () => {
      expect(isErrorId('HM6HK5G6')).toBe(true);
      expect(isErrorId('hm6hk5g6')).toBe(true);
      expect(isErrorId('01234567')).toBe(true);
      expect(isErrorId('ABCDEFGH')).toBe(true);
      expect(isErrorId('JKMNPQRS')).toBe(true);
      expect(isErrorId('TVWXYZ01')).toBe(true);
    });

    it('rejects forbidden Crockford letters I, L, O, U', () => {
      expect(isErrorId('HM6HK5GI')).toBe(false);
      expect(isErrorId('HM6HK5GL')).toBe(false);
      expect(isErrorId('HM6HK5GO')).toBe(false);
      expect(isErrorId('HM6HK5GU')).toBe(false);
    });

    it('rejects length other than 8 chars, blank, null, undefined', () => {
      expect(isErrorId('HM6HK5G')).toBe(false); // 7 chars
      expect(isErrorId('HM6HK5G6A')).toBe(false); // 9 chars
      expect(isErrorId('')).toBe(false);
      expect(isErrorId('   ')).toBe(false);
      expect(isErrorId(null)).toBe(false);
      expect(isErrorId(undefined)).toBe(false);
    });
  });

  describe('isValidRef', () => {
    it('accepts valid 1-64 character strings using alphanumeric, hyphen, and underscore', () => {
      expect(isValidRef('a')).toBe(true);
      expect(isValidRef('e2ereq0000000000001a')).toBe(true);
      expect(isValidRef('HM6HK5G6')).toBe(true);
      expect(isValidRef('smoke-123_456')).toBe(true);
      expect(isValidRef('a'.repeat(64))).toBe(true);
    });

    it('rejects invalid characters, spaces, 65+ chars, null, undefined', () => {
      expect(isValidRef('bad$ref')).toBe(false);
      expect(isValidRef('ref with spaces')).toBe(false);
      expect(isValidRef('a'.repeat(65))).toBe(false);
      expect(isValidRef('')).toBe(false);
      expect(isValidRef('   ')).toBe(false);
      expect(isValidRef(null)).toBe(false);
      expect(isValidRef(undefined)).toBe(false);
    });
  });

  describe('refOf', () => {
    it('follows precedence errorId -> requestId -> digest', () => {
      expect(
        refOf({
          errorId: 'ERR12345',
          requestId: 'REQ12345',
          digest: 'DIG12345',
        }),
      ).toBe('ERR12345');

      expect(
        refOf({
          errorId: null,
          requestId: 'REQ12345',
          digest: 'DIG12345',
        }),
      ).toBe('REQ12345');

      expect(
        refOf({
          errorId: '   ',
          requestId: '',
          digest: 'DIG12345',
        }),
      ).toBe('DIG12345');
    });

    it('trims whitespace and returns undefined when all are empty or null input', () => {
      expect(
        refOf({
          errorId: '  ERR12345  ',
        }),
      ).toBe('ERR12345');

      expect(refOf({ errorId: '', requestId: null, digest: undefined })).toBeUndefined();
      expect(refOf(null)).toBeUndefined();
      expect(refOf(undefined)).toBeUndefined();
    });
  });
});

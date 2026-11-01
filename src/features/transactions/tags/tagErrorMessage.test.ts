import { describe, expect, it } from 'vitest';

import { ActionError } from '@/lib/actionResult';

import { tagErrorMessage } from './useTagMutations';

describe('tagErrorMessage', () => {
  it('words a CONFLICT as a duplicate name, and keeps the server message or the fallback otherwise', () => {
    expect(tagErrorMessage(new ActionError({ code: 'CONFLICT', message: 'dup' } as never), 'x')).toBe('A tag with this name already exists.');
    expect(tagErrorMessage(new ActionError({ code: 'VALIDATION', message: 'Name too long' } as never), 'x')).toBe('Name too long');
    expect(tagErrorMessage(undefined, "Couldn't rename the tag. Try again.")).toBe("Couldn't rename the tag. Try again.");
  });
});

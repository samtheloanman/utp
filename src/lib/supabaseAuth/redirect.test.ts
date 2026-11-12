import { describe, expect, it } from 'vitest';
import { safeRedirectPath } from './redirect';

describe('safeRedirectPath', () => {
  it.each(['@evil.com', '.evil.com', '//evil.com', '/\\evil.com', 'https://evil.com', 'javascript:alert(1)', '/%2f%2fevil.com', '/ok\nSet-Cookie:x', '', null, undefined])(
    'rejects %s',
    (v) => expect(safeRedirectPath(v as string)).toBe('/'),
  );

  it('keeps same-origin path, query and hash', () =>
    expect(safeRedirectPath('/oauth/consent?authorization_id=a%20b#x')).toBe('/oauth/consent?authorization_id=a%20b#x'));
});

import { safeReturnPath } from './safe-return-path';

describe('safeReturnPath', () => {
  it('keeps internal application paths', () => {
    expect(safeReturnPath('/app?tab=account')).toBe('/app?tab=account');
  });

  it.each(['https://evil.example', '//evil.example', '', null, undefined])(
    'rejects an external or invalid target: %s',
    (value) => {
      expect(safeReturnPath(value)).toBe('/app');
    },
  );
});

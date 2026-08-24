import { describe, expect, it } from 'vitest';
import { isNewerVersion } from './whatsNew';

/**
 * Only the pure half of the module is exercised here. The rest of it
 * (claimUnseenVersion and the two markers) reaches for localStorage and for the
 * encrypted prefs record, so it belongs to the app rather than to the suite —
 * but every decision it makes routes through this one comparison, which is
 * where a "What's new" pane either shows once or shows forever.
 */
describe('isNewerVersion', () => {
  it('compares part by part, not as a string', () => {
    // '0.10.0' sorts before '0.9.0' lexically, which is exactly the bug.
    expect(isNewerVersion('0.10.0', '0.9.0')).toBe(true);
    expect(isNewerVersion('0.9.0', '0.10.0')).toBe(false);
  });

  it('is strict: the same version is not newer than itself', () => {
    expect(isNewerVersion('1.2.3', '1.2.3')).toBe(false);
  });

  it('ranks major over minor over patch', () => {
    expect(isNewerVersion('2.0.0', '1.9.9')).toBe(true);
    expect(isNewerVersion('1.3.0', '1.2.9')).toBe(true);
    expect(isNewerVersion('1.2.4', '1.2.3')).toBe(true);
    expect(isNewerVersion('1.2.3', '1.2.4')).toBe(false);
  });

  it('treats a first-ever run as new, so the pane is not skipped', () => {
    expect(isNewerVersion('0.1.0', null)).toBe(true);
    expect(isNewerVersion('0.1.0', '')).toBe(true);
  });

  it('pads a shorter version with zeroes rather than mis-ranking it', () => {
    expect(isNewerVersion('1.2', '1.2.0')).toBe(false);
    expect(isNewerVersion('1.2.1', '1.2')).toBe(true);
    expect(isNewerVersion('1.2', '1.2.1')).toBe(false);
    expect(isNewerVersion('2', '1.9.9')).toBe(true);
  });

  it('reads an unparseable part as zero instead of yielding NaN', () => {
    // NaN comparisons are all false, which would silently answer "not newer"
    // and suppress the pane forever.
    expect(isNewerVersion('1.0.0', 'not-a-version')).toBe(true);
    expect(isNewerVersion('not-a-version', '1.0.0')).toBe(false);
  });

  it('reads the leading digits of a part, so a suffix does not derail the rank', () => {
    expect(isNewerVersion('1.1.0-rc1', '1.0.0')).toBe(true);
    expect(isNewerVersion('1.0.0', '1.1.0-rc1')).toBe(false);
  });
});

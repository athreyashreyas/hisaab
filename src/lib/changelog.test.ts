import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { APP_VERSION, CHANGELOG } from './changelog';
import { GUIDE, GUIDE_ESSENTIALS, GUIDE_MORE, type GuideArtKind } from './guide';
import { isNewerVersion } from './whatsNew';

/**
 * The changelog is data, not code, and it is the single source of truth for the
 * app version — so the things that can go wrong with it are the things that go
 * wrong with hand-maintained lists: an entry added in the wrong place, a version
 * that no longer matches package.json, a release pointing at an illustration
 * nobody drew. Each of those is silent at runtime and visible only in the
 * "What's new" pane, which is a poor place to find out.
 */
const pkg = JSON.parse(
  readFileSync(resolve(__dirname, '../../package.json'), 'utf8')
) as { version: string };

// Every kind GuideArt knows how to draw, taken from the sections that use them
// plus the release art in the changelog — the type itself is erased at runtime.
const ART_KINDS = new Set<GuideArtKind>([
  'logo',
  'clarity',
  'nav',
  'safeToSpend',
  'adding',
  'denominations',
  'ledger',
  'accounts',
  'money',
  'goals',
  'goalPlan',
  'investments',
  'insights',
  'recurring',
  'themes',
  'security',
  'sync',
  'message',
]);

describe('APP_VERSION', () => {
  it('is the newest release, which is what everything else reads', () => {
    expect(APP_VERSION).toBe(CHANGELOG[0].version);
  });

  it('agrees with package.json, so a bump cannot land in only one place', () => {
    expect(APP_VERSION).toBe(pkg.version);
  });

  it('is a plain dotted version the comparison can rank', () => {
    expect(APP_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});

describe('CHANGELOG', () => {
  it('is ordered newest first', () => {
    // "What's new" reads entry zero; an entry added at the bottom would never
    // be shown, and one added out of order would show the wrong release.
    for (let i = 1; i < CHANGELOG.length; i++) {
      expect(isNewerVersion(CHANGELOG[i - 1].version, CHANGELOG[i].version)).toBe(true);
    }
  });

  it('has its dates running newest first too', () => {
    for (let i = 1; i < CHANGELOG.length; i++) {
      expect(CHANGELOG[i - 1].date >= CHANGELOG[i].date).toBe(true);
    }
  });

  it('lists each version once', () => {
    const versions = CHANGELOG.map((r) => r.version);
    expect(new Set(versions).size).toBe(versions.length);
  });

  it('gives every release a version, an ISO date, a title and at least one note', () => {
    for (const r of CHANGELOG) {
      expect(r.version).toMatch(/^\d+\.\d+\.\d+$/);
      expect(r.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(Number.isNaN(Date.parse(r.date))).toBe(false);
      expect(r.title.trim().length).toBeGreaterThan(0);
      expect(r.notes.length).toBeGreaterThan(0);
      for (const note of r.notes) expect(note.trim().length).toBeGreaterThan(0);
    }
  });

  it('only asks for illustrations GuideArt can actually draw', () => {
    for (const r of CHANGELOG) {
      if (r.art) expect(ART_KINDS.has(r.art)).toBe(true);
    }
  });

  it('gives any how-to steps real text rather than empty bullets', () => {
    for (const r of CHANGELOG) {
      for (const step of r.howTo ?? []) expect(step.trim().length).toBeGreaterThan(0);
    }
  });
});

describe('GUIDE', () => {
  it('gives every section an id, a title, a body, an icon and an illustration', () => {
    for (const s of GUIDE) {
      expect(s.id).toMatch(/^[a-z0-9-]+$/);
      expect(s.title.trim().length).toBeGreaterThan(0);
      expect(s.body.length).toBeGreaterThan(0);
      for (const para of s.body) expect(para.trim().length).toBeGreaterThan(0);
      expect(s.icon).toMatch(/^[a-z-]+$/); // lucide-react names are kebab-case
      expect(ART_KINDS.has(s.art)).toBe(true);
    }
  });

  it('uses each section id once, since the guide navigates by it', () => {
    const ids = GUIDE.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('gives any steps real text', () => {
    for (const s of GUIDE) {
      for (const step of s.steps ?? []) expect(step.trim().length).toBeGreaterThan(0);
    }
  });

  it('keeps the opening read short, however many features land later', () => {
    // This screen is shown the moment onboarding ends, before anybody has
    // logged a rupee. It is worth reading only while it is short, so a new
    // feature is folded away rather than added to what everyone scrolls past.
    expect(GUIDE_ESSENTIALS.length).toBeLessThanOrEqual(5);
    expect(GUIDE_ESSENTIALS.length).toBeGreaterThan(0);
    // And the opening read comes first, since the page renders it that way.
    expect(GUIDE.slice(0, GUIDE_ESSENTIALS.length)).toEqual(GUIDE_ESSENTIALS);
  });

  it('gives every folded section a summary, which is all a reader sees of it', () => {
    for (const s of GUIDE_MORE) {
      expect(s.summary?.trim().length ?? 0).toBeGreaterThan(0);
    }
  });

  it('holds each section to a length somebody will actually read', () => {
    // Two paragraphs and three steps. A section that wants more is usually a
    // screen that should be explaining itself better.
    for (const s of GUIDE) {
      expect(s.body.length).toBeLessThanOrEqual(2);
      expect(s.steps?.length ?? 0).toBeLessThanOrEqual(3);
    }
  });
});

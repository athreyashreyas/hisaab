import { describe, expect, it } from 'vitest';
import {
  deriveAuthToken,
  generateRecoveryPhrase,
  normalizeEmail,
  normalizeRecoveryPhrase,
} from './account';

/**
 * The property that matters here is the one the whole design rests on: the
 * token sent to Supabase is a slow, salted function of the password, derived
 * independently of the passphrase that unwraps the vault. So these run the real
 * Argon2id rather than stubbing it — a stub would fake exactly the thing under
 * test. Each derivation costs a few hundred milliseconds, so the suite derives
 * as few tokens as it can get away with.
 */

describe('normalizeEmail', () => {
  it('folds case and surrounding whitespace, so the salt is stable', () => {
    expect(normalizeEmail('  Noor@Example.COM ')).toBe('noor@example.com');
  });

  it('leaves an already-canonical address alone', () => {
    expect(normalizeEmail('noor@example.com')).toBe('noor@example.com');
  });

  it('does not touch the inside of the address', () => {
    // Plus-addressing and dots are meaningful to some providers; folding them
    // would silently merge two different accounts onto one salt.
    expect(normalizeEmail('noor+hisaab@example.com')).toBe('noor+hisaab@example.com');
    expect(normalizeEmail('first.last@example.com')).toBe('first.last@example.com');
  });
});

describe('deriveAuthToken', () => {
  it('is 64 hex characters — 32 bytes, under bcrypt 72-byte limit', async () => {
    const token = await deriveAuthToken('noor@example.com', 'a strong password');
    expect(token).toMatch(/^[0-9a-f]{64}$/);
  });

  it('is deterministic, so the same person derives it on any device', async () => {
    const [a, b] = await Promise.all([
      deriveAuthToken('noor@example.com', 'a strong password'),
      deriveAuthToken('  NOOR@Example.com ', 'a strong password'),
    ]);
    expect(a).toBe(b);
  });

  it('salts by email, so two people sharing a password get different tokens', async () => {
    const [a, b] = await Promise.all([
      deriveAuthToken('noor@example.com', 'shared password'),
      deriveAuthToken('ravi@example.com', 'shared password'),
    ]);
    expect(a).not.toBe(b);
  });

  it('changes completely when the password changes', async () => {
    const [a, b] = await Promise.all([
      deriveAuthToken('noor@example.com', 'password one'),
      deriveAuthToken('noor@example.com', 'password two'),
    ]);
    expect(a).not.toBe(b);
  });

  it('never contains the password it was derived from', async () => {
    const token = await deriveAuthToken('noor@example.com', 'deadbeef');
    // The server stores only a hash of this; it must not be a reversible
    // encoding of the secret.
    expect(token).not.toContain('deadbeef');
  });

  it('normalises the password to NFKC, so the same keystrokes always match', async () => {
    // 'caf\u00e9' and 'cafe\u0301' render identically and are what different
    // keyboards actually emit; without NFKC one of them locks the owner out.
    const composed = 'caf\u00e9';
    const decomposed = 'cafe\u0301';
    expect(composed).not.toBe(decomposed);
    const [a, b] = await Promise.all([
      deriveAuthToken('noor@example.com', composed),
      deriveAuthToken('noor@example.com', decomposed),
    ]);
    expect(a).toBe(b);
  });
});

describe('generateRecoveryPhrase', () => {
  it('is twelve lowercase words by default', () => {
    const phrase = generateRecoveryPhrase();
    const words = phrase.split(' ');
    expect(words).toHaveLength(12);
    for (const w of words) expect(w).toMatch(/^[a-z]+$/);
  });

  it('honours a requested length', () => {
    expect(generateRecoveryPhrase(24).split(' ')).toHaveLength(24);
  });

  it('is different every time', () => {
    const phrases = new Set(Array.from({ length: 20 }, () => generateRecoveryPhrase()));
    expect(phrases.size).toBe(20);
  });

  it('draws from a wordlist of exactly 256, so a random byte picks with no bias', () => {
    // Anything other than 256 makes `byte % length` favour the early words, and
    // the phrase quietly loses entropy.
    const seen = new Set<string>();
    for (let i = 0; i < 400; i++) for (const w of generateRecoveryPhrase().split(' ')) seen.add(w);
    // 4,800 draws over 256 words: seeing nearly all of them is near-certain,
    // and seeing more than 256 distinct words would mean the list has grown.
    expect(seen.size).toBeLessThanOrEqual(256);
    expect(seen.size).toBeGreaterThan(240);
  });

  it('round-trips through the normaliser it will be typed back into', () => {
    const phrase = generateRecoveryPhrase();
    expect(normalizeRecoveryPhrase(phrase)).toBe(phrase);
  });
});

describe('normalizeRecoveryPhrase', () => {
  it('forgives the ways a phrase gets written down and typed back', () => {
    expect(normalizeRecoveryPhrase('  Able   Acid\nAcre\tAged ')).toBe('able acid acre aged');
  });

  it('collapses runs of whitespace rather than producing empty words', () => {
    expect(normalizeRecoveryPhrase('able     acid')).toBe('able acid');
    expect(normalizeRecoveryPhrase('   ')).toBe('');
  });

  it('is idempotent, so normalising twice is the same as once', () => {
    const once = normalizeRecoveryPhrase(' Able  ACID ');
    expect(normalizeRecoveryPhrase(once)).toBe(once);
  });

  it('makes a phrase written in any case unwrap the same vault', async () => {
    // The phrase wraps the DEK in canonical form, so what the user types has to
    // land on the same string however they wrote it.
    expect(normalizeRecoveryPhrase('ABLE ACID')).toBe(normalizeRecoveryPhrase('able  acid'));
  });
});

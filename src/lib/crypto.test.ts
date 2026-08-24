import { afterEach, describe, expect, it } from 'vitest';
import {
  createVault,
  exportDekB64,
  exportVault,
  importDekB64,
  keyring,
  openRecord,
  rewrapDek,
  sealRecord,
  unlockVault,
  VaultLockedError,
  WrongPassphraseError,
} from './crypto';

/**
 * These run the real Argon2id (64 MB, 3 passes) rather than a stub, because the
 * property worth testing is that a wrong passphrase genuinely cannot unwrap the
 * key — which is exactly the part a stub would fake. That costs a few hundred
 * milliseconds per derivation, so the suite creates as few vaults as it can and
 * shares them across the assertions that do not need a fresh one.
 */
const PASSPHRASE = 'correct horse battery staple';

// One vault, built once: every unlock assertion derives its own KEK anyway, so
// the shared setup costs nothing in coverage.
const vault = await createVault(PASSPHRASE);

afterEach(() => keyring.clear());

describe('createVault', () => {
  it('hands back a wrapped key holding no secret in the clear', () => {
    expect(vault.wrapped.version).toBe(1);
    expect(vault.wrapped.salt.length).toBeGreaterThan(0);
    expect(vault.wrapped.wrappedDek).toContain('.'); // iv.ciphertext
    expect(JSON.stringify(vault.wrapped)).not.toContain(PASSPHRASE);
  });

  it('records the KDF cost, so it can be raised later without breaking old vaults', () => {
    expect(vault.wrapped.kdf).toEqual({ memoryKiB: 65_536, iterations: 3, parallelism: 1 });
  });

  it('gives every vault its own salt and its own key', async () => {
    const other = await createVault(PASSPHRASE);
    expect(other.wrapped.salt).not.toBe(vault.wrapped.salt);
    expect(other.wrapped.wrappedDek).not.toBe(vault.wrapped.wrappedDek);
    // Same passphrase, different DEK: the two vaults cannot read each other.
    const sealed = await sealRecord(vault.dek, { note: 'hello' });
    await expect(openRecord(other.dek, sealed)).rejects.toThrow();
  });
});

describe('unlockVault', () => {
  it('recovers a DEK that reads what the original sealed', async () => {
    const sealed = await sealRecord(vault.dek, { amount: 12_345 });
    const dek = await unlockVault(PASSPHRASE, vault.wrapped);
    await expect(openRecord(dek, sealed)).resolves.toEqual({ amount: 12_345 });
  });

  it('refuses a wrong passphrase with a named error, not a raw GCM failure', async () => {
    await expect(unlockVault('not the passphrase', vault.wrapped)).rejects.toBeInstanceOf(
      WrongPassphraseError
    );
  });

  it('refuses a passphrase that differs by one character', async () => {
    await expect(unlockVault(`${PASSPHRASE} `, vault.wrapped)).rejects.toBeInstanceOf(
      WrongPassphraseError
    );
  });

  it('cannot be unlocked with the right passphrase against a different salt', async () => {
    // The salt is not secret, but swapping it changes the KEK entirely.
    const tampered = { ...vault.wrapped, salt: (await createVault('x')).wrapped.salt };
    await expect(unlockVault(PASSPHRASE, tampered)).rejects.toBeInstanceOf(WrongPassphraseError);
  });
});

describe('rewrapDek', () => {
  it('lets a second secret open the same vault without re-encrypting it', async () => {
    // This is the whole point of the DEK/KEK indirection: a passphrase change
    // re-wraps one key rather than rewriting every record.
    const sealed = await sealRecord(vault.dek, { merchant: 'Third Wave' });
    const recovery = await rewrapDek(vault.dek, 'twelve word recovery phrase goes here');
    const viaRecovery = await unlockVault('twelve word recovery phrase goes here', recovery);
    await expect(openRecord(viaRecovery, sealed)).resolves.toEqual({ merchant: 'Third Wave' });
  });

  it('leaves the original passphrase working, so both ways in stand', async () => {
    const recovery = await rewrapDek(vault.dek, 'a second secret entirely');
    await expect(unlockVault(PASSPHRASE, vault.wrapped)).resolves.toBeTruthy();
    await expect(unlockVault('a second secret entirely', recovery)).resolves.toBeTruthy();
  });

  it('gives the new wrap its own salt', async () => {
    const recovery = await rewrapDek(vault.dek, 'a third secret');
    expect(recovery.salt).not.toBe(vault.wrapped.salt);
    expect(recovery.version).toBe(1);
  });
});

describe('sealRecord / openRecord', () => {
  it('round-trips a record through JSON unchanged', async () => {
    const record = {
      id: 'txn-1',
      amount: 49_950,
      merchant: 'Third Wave Coffee',
      splits: [{ who: 'Noor', amount: 24_975, settled: false }],
      deleted_at: null,
    };
    const sealed = await sealRecord(vault.dek, record);
    await expect(openRecord(vault.dek, sealed)).resolves.toEqual(record);
  });

  it('leaves nothing readable in the envelope', async () => {
    const sealed = await sealRecord(vault.dek, { merchant: 'Third Wave Coffee' });
    expect(sealed.ct).not.toContain('Third Wave');
    expect(atob(sealed.ct)).not.toContain('Third Wave');
  });

  it('uses a fresh IV each time, so the same record never seals identically', async () => {
    // A repeated IV under AES-GCM leaks the plaintext difference outright.
    const a = await sealRecord(vault.dek, { amount: 100 });
    const b = await sealRecord(vault.dek, { amount: 100 });
    expect(a.iv).not.toBe(b.iv);
    expect(a.ct).not.toBe(b.ct);
  });

  it('refuses a tampered ciphertext rather than returning garbage', async () => {
    // GCM authenticates; a flipped byte has to fail, not decrypt to nonsense.
    const sealed = await sealRecord(vault.dek, { amount: 100 });
    const bytes = atob(sealed.ct).split('');
    bytes[0] = String.fromCharCode(bytes[0].charCodeAt(0) ^ 0xff);
    await expect(openRecord(vault.dek, { ...sealed, ct: btoa(bytes.join('')) })).rejects.toThrow();
  });

  it('refuses an envelope resealed under someone else IV', async () => {
    const a = await sealRecord(vault.dek, { amount: 100 });
    const b = await sealRecord(vault.dek, { amount: 200 });
    await expect(openRecord(vault.dek, { iv: a.iv, ct: b.ct })).rejects.toThrow();
  });

  it('handles a record with no fields at all', async () => {
    const sealed = await sealRecord(vault.dek, {});
    await expect(openRecord(vault.dek, sealed)).resolves.toEqual({});
  });
});

describe('exportDekB64 / importDekB64', () => {
  it('round-trips the live key, which is what makes auto-unlock work', async () => {
    const b64 = await exportDekB64(vault.dek);
    const restored = await importDekB64(b64);
    const sealed = await sealRecord(restored, { amount: 7 });
    await expect(openRecord(vault.dek, sealed)).resolves.toEqual({ amount: 7 });
  });

  it('serialises a 256-bit key', async () => {
    expect(atob(await exportDekB64(vault.dek))).toHaveLength(32);
  });
});

describe('exportVault', () => {
  it('bundles the wrapped key and the sealed records under a recognisable format', async () => {
    const records = [await sealRecord(vault.dek, { id: 'a' })];
    const backup = exportVault(vault.wrapped, records);
    expect(backup).toEqual({
      format: 'hisaab-vault',
      version: 1,
      wrapped: vault.wrapped,
      records,
    });
  });

  it('is safe to write to disk: no passphrase and no bare key inside it', async () => {
    const backup = exportVault(vault.wrapped, [
      await sealRecord(vault.dek, { merchant: 'Third Wave Coffee' }),
    ]);
    const json = JSON.stringify(backup);
    expect(json).not.toContain(PASSPHRASE);
    expect(json).not.toContain('Third Wave');
    expect(json).not.toContain(await exportDekB64(vault.dek));
  });
});

describe('keyring', () => {
  it('starts locked and says so with a named error', () => {
    expect(keyring.isUnlocked()).toBe(false);
    expect(() => keyring.get()).toThrow(VaultLockedError);
  });

  it('hands back exactly the key it was given', () => {
    keyring.set(vault.dek);
    expect(keyring.isUnlocked()).toBe(true);
    expect(keyring.get()).toBe(vault.dek);
  });

  it('locks again on clear', () => {
    keyring.set(vault.dek);
    keyring.clear();
    expect(keyring.isUnlocked()).toBe(false);
    expect(() => keyring.get()).toThrow(VaultLockedError);
  });
});

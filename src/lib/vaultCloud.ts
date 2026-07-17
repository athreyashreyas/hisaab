/**
 * Cloud I/O for the wrapped vault keys. The server holds two wraps of the DEK —
 * one under the password KEK, one under the recovery-phrase KEK — plus the salt
 * and KDF params. All useless without the password or the phrase. Owner-only via
 * RLS. Takes the user id explicitly so it has no dependency on the account store
 * (avoids an import cycle with sync.ts).
 */
import { supabase } from './supabase';
import type { WrappedVaultKey } from './crypto';

export interface CloudVaultKeys {
  wrapped: WrappedVaultKey;
  recoveryWrap: WrappedVaultKey | null;
}

export async function pushVaultKeys(
  userId: string,
  wrapped: WrappedVaultKey,
  recoveryWrap: WrappedVaultKey | null
): Promise<void> {
  if (!supabase) return;
  const { error } = await supabase.from('vault_keys').upsert({
    user_id: userId,
    salt: wrapped.salt,
    wrapped_dek: wrapped.wrappedDek,
    kdf: wrapped.kdf,
    recovery_wrap: recoveryWrap ?? null,
    updated_at: new Date().toISOString(),
  });
  if (error) throw error;
}

export async function fetchVaultKeys(userId: string): Promise<CloudVaultKeys | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('vault_keys')
    .select('salt, wrapped_dek, kdf, recovery_wrap')
    .eq('user_id', userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    wrapped: { salt: data.salt, wrappedDek: data.wrapped_dek, kdf: data.kdf, version: 1 },
    recoveryWrap: (data.recovery_wrap as WrappedVaultKey | null) ?? null,
  };
}

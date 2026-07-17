-- Unified account model: one password logs you in AND unlocks your data, with a
-- recovery phrase to reset the password without losing the encrypted ledger.
--
-- To let a password reset work on ANY device (including one that has never seen
-- the vault), the DEK must also be recoverable from the recovery phrase in the
-- cloud. We store a second wrap of the DEK — the DEK encrypted under a key
-- derived from the recovery phrase — alongside the password wrap. Both are
-- useless to the server: one needs the password, the other the phrase, and the
-- server derives neither.
--
-- `recovery_wrap` is a full WrappedVaultKey {salt, wrappedDek, kdf, version}.

alter table public.vault_keys
  add column if not exists recovery_wrap jsonb;

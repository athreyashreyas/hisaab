-- Hisaab cloud backup schema.
--
-- The server stores ONLY ciphertext + sync metadata. There are no plaintext
-- amount / merchant / category columns anywhere. Two tables, both owner-only
-- via RLS so a user can never read another user's rows (encrypted though they
-- are). Matches what src/lib/sync.ts pushes and pulls.

-- ---------------------------------------------------------------------------
-- vault_keys: one wrapped DEK per user. The wrapped DEK + salt are useless
-- without the passphrase, so this holds no secret in the clear. A new device
-- fetches this row to enable unlock.
-- ---------------------------------------------------------------------------
create table if not exists public.vault_keys (
  user_id     uuid primary key references auth.users (id) on delete cascade,
  salt        text        not null,
  wrapped_dek text        not null,
  kdf         jsonb       not null,
  updated_at  timestamptz not null default now()
);

alter table public.vault_keys enable row level security;

drop policy if exists "vault_keys owner" on public.vault_keys;
create policy "vault_keys owner"
  on public.vault_keys
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- records: opaque {iv, ct} blobs plus sync bookkeeping. `id` is the client-side
-- uuid of the underlying row; `table_name` says which local table it belongs to.
-- Last-write-wins reconciliation happens on the client using updated_at.
-- ---------------------------------------------------------------------------
create table if not exists public.records (
  user_id     uuid        not null references auth.users (id) on delete cascade,
  id          uuid        not null,
  table_name  text        not null,
  iv          text        not null,
  ct          text        not null,
  updated_at  timestamptz not null default now(),
  deleted_at  timestamptz,
  primary key (user_id, id)
);

alter table public.records enable row level security;

drop policy if exists "records owner" on public.records;
create policy "records owner"
  on public.records
  for all
  to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- Pull queries fetch "everything for me changed since <cursor>, in order".
create index if not exists records_user_updated_idx
  on public.records (user_id, updated_at);

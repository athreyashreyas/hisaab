/**
 * Local exports. Two kinds:
 *  - CSV: a plaintext, human-readable ledger for spreadsheets (stays on device).
 *  - Vault backup: a fully offline *encrypted* bundle (wrapped key + sealed
 *    records) that can be re-imported on any device with the passphrase.
 */
import { db } from './db';
import { sealRecord, openRecord, keyring, exportVault, type Envelope, type VaultBackup } from './crypto';
import { currentWrappedKey } from './vaultStorage';
import { formatINR } from './calculations';
import type { Account, Category, Transaction } from '../types';

function download(filename: string, data: string, mime: string) {
  const blob = new Blob([data], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function csvCell(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** Human-readable CSV of all transactions (local only). */
export async function exportTransactionsCsv(): Promise<void> {
  const [txns, accounts, categories] = await Promise.all([
    db.transactions.toArray(),
    db.accounts.toArray(),
    db.categories.toArray(),
  ]);
  const accById = new Map<string, Account>(accounts.map((a) => [a.id, a]));
  const catById = new Map<string, Category>(categories.map((c) => [c.id, c]));

  const header = ['Date', 'Type', 'Amount (₹)', 'Account', 'To account', 'Category', 'Merchant', 'Note'];
  const rows = txns
    .filter((t: Transaction) => !t.deleted_at)
    .sort((a, b) => b.date - a.date)
    .map((t) =>
      [
        new Date(t.date).toISOString().slice(0, 10),
        t.type,
        formatINR(t.amount, true).replace('₹', ''),
        accById.get(t.account_id)?.name ?? '',
        t.to_account_id ? accById.get(t.to_account_id)?.name ?? '' : '',
        t.category_id ? catById.get(t.category_id)?.name ?? '' : '',
        t.merchant,
        t.note,
      ]
        .map((c) => csvCell(String(c)))
        .join(',')
    );

  download(`hisaab-${today()}.csv`, [header.join(','), ...rows].join('\n'), 'text/csv');
}

const SYNC_TABLES = [
  'accounts',
  'categories',
  'transactions',
  'goals',
  'goal_contributions',
  'investments',
  'recurring_rules',
] as const;

/** Seal every local record and bundle with the wrapped key → offline encrypted backup. */
export async function exportEncryptedVault(): Promise<void> {
  const dek = keyring.get();
  const wrapped = currentWrappedKey();
  if (!wrapped) throw new Error('No vault key found.');

  const records: Envelope[] = [];
  for (const table of SYNC_TABLES) {
    const rows = await db.table(table).toArray();
    for (const row of rows) {
      records.push(await sealRecord(dek, { __table: table, ...row }));
    }
  }

  const backup = exportVault(wrapped, records);
  download(`hisaab-vault-${today()}.json`, JSON.stringify(backup), 'application/json');
}

/**
 * Import an encrypted vault backup. Records are opened with the *current* session
 * DEK (same passphrase family) and merged with last-write-wins. Returns the count
 * restored.
 */
export async function importEncryptedVault(file: File): Promise<number> {
  const dek = keyring.get();
  const backup = JSON.parse(await file.text()) as VaultBackup;
  if (backup.format !== 'hisaab-vault') throw new Error('Not a Hisaab vault backup.');

  let restored = 0;
  for (const env of backup.records) {
    const rec = await openRecord<{ __table: (typeof SYNC_TABLES)[number]; id: string; updated_at: number }>(
      dek,
      env
    );
    const { __table, ...row } = rec;
    if (!SYNC_TABLES.includes(__table)) continue;
    const existing = await db.table(__table).get(row.id);
    if (existing && existing.updated_at >= row.updated_at) continue;
    await db.table(__table).put(row);
    restored++;
  }
  return restored;
}

function today(): string {
  return new Date().toISOString().slice(0, 10);
}

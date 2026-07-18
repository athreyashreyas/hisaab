/**
 * Account credential derivation — the piece that lets ONE password both log you
 * in and unlock your data, without the server ever seeing the key to your data.
 *
 *   password ─┬─ deriveAuthToken(email,password) ─▶ sent to Supabase as the
 *             │                                     "password" (server stores
 *             │                                     only a hash of THIS)
 *             └─ used directly as the vault passphrase (lib/crypto) to wrap the
 *                DEK ─▶ never leaves the device
 *
 * The two derivations are independent: the server learns the auth token, which
 * is a slow-hashed function of the password, but never the password itself and
 * never the key that decrypts the ledger. Cracking the auth token from a DB leak
 * costs a full Argon2id per guess, the same wall we put in front of the data.
 *
 * The recovery phrase is a separate, high-entropy secret that independently wraps
 * the same DEK (stored in the cloud too), so a password reset can restore access
 * on any device. It is generated here and never stored anywhere by us.
 */
// Loaded on demand so the Argon2id wasm stays out of the cold-start bundle; it's
// only needed when signing in, registering, or changing the password.
async function loadArgon2id() {
  return (await import('hash-wasm')).argon2id;
}

const AUTH_KDF = { memoryKiB: 64 * 1024, iterations: 3, parallelism: 1 };
const AUTH_VERSION = 'hisaab-auth-v1';

/** Normalize an email the same way every time so the derived salt is stable. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

/**
 * Deterministically derive the Supabase auth secret from (email, password).
 * Salt is bound to the email so two people with the same password get different
 * tokens, and the same person derives the same token on any device. Returns 64
 * hex chars (32 bytes) — under bcrypt's 72-byte limit, satisfies length rules.
 */
export async function deriveAuthToken(email: string, password: string): Promise<string> {
  const saltSource = new TextEncoder().encode(`${AUTH_VERSION}:${normalizeEmail(email)}`);
  const saltBuf = await crypto.subtle.digest('SHA-256', saltSource);
  const salt = new Uint8Array(saltBuf).slice(0, 16);
  const argon2id = await loadArgon2id();
  return argon2id({
    password: password.normalize('NFKC'),
    salt,
    parallelism: AUTH_KDF.parallelism,
    iterations: AUTH_KDF.iterations,
    memorySize: AUTH_KDF.memoryKiB,
    hashLength: 32,
    outputType: 'hex',
  });
}

// --- recovery phrase ------------------------------------------------------

// A compact, unambiguous wordlist (exactly 256 words → one random byte selects a
// word with no modulo bias). Twelve words gives 96 bits of entropy, which is
// then stretched by Argon2id when it wraps the DEK. Short, common, lowercase
// words, easy to write down and read back.
const WORDS = (
  'able acid acre aged airy alarm album alert alley amber amble anchor angel angle ankle apple ' +
  'apron arbor arch arena armor arrow ash aside aspen atlas attic autumn avenue awake axis azure ' +
  'bacon badge bagel baker balm bamboo banjo barn basil basin batch beach beam bean bear ' +
  'beaver beech berry birch bison blade bloom board boat bonus booth bottle boulder brave bread ' +
  'brick bridge broom brook brush bubble bucket buffet bulb bundle bunny burrow cabin cable cacao ' +
  'cactus camel candle canoe canyon carbon cargo carol carrot castle cedar cello chalk charm cheese ' +
  'cherry chess chime cider cinder clay clever cliff cloak clover cocoa comet coral cotton cove ' +
  'cozy crane crater cream creek crisp crown crystal cube dahlia daisy dandy dawn deer delta denim ' +
  'depot desert diner dome donut dove dozen dragon dune eagle east ebony echo eddy elder elm ' +
  'ember emerald ether fable falcon fawn feather fennel fern ferry fiber fig finch flame flint float ' +
  'flour flute forest fox frost galaxy garden gecko ginger glade glass globe gold gorge granite grape ' +
  'grove guava halo hamlet harbor hazel heron hollow honey horizon ivory ivy jade jasmine jelly jewel ' +
  'juniper kettle kiln koala lagoon lantern lark laurel leaf ledge lemon lily linen lotus lunar lynx ' +
  'maple marble meadow melon mesa mint mirror moss motor moth mulberry nectar noble north oak oasis ' +
  'ocean olive onyx opal orbit orchid otter oxen pearl pebble pecan pepper petal pine pixel plum ' +
  'pond poppy prairie quartz quiet radish raft raven reef ridge river robin sage salt sand willow ' +
  'wave wheat wren zephyr zinc'
).split(/\s+/);

/** Generate a 12-word recovery phrase. Never stored by us; the user keeps it. */
export function generateRecoveryPhrase(wordCount = 12): string {
  const bytes = new Uint8Array(wordCount);
  crypto.getRandomValues(bytes);
  const words: string[] = [];
  for (let i = 0; i < wordCount; i++) words.push(WORDS[bytes[i] % WORDS.length]);
  return words.join(' ');
}

/** Canonical form used both when generating the wrap and when the user types it back. */
export function normalizeRecoveryPhrase(input: string): string {
  return input.trim().toLowerCase().split(/\s+/).filter(Boolean).join(' ');
}

// Guard: the wordlist must be exactly 256 for uniform byte→word selection.
if (WORDS.length !== 256) {
  // A build-time sanity check; surfaces immediately in dev if the list drifts.
  console.warn(`[account] recovery wordlist is ${WORDS.length} words, expected 256`);
}

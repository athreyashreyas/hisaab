import { defineConfig } from 'vitest/config';

/**
 * The suite covers Hisaab's pure logic — money formatting, the calendar
 * helpers every date conversion goes through, budget and goal pacing,
 * recurrence, earmarks, portfolio arithmetic. None of it needs a DOM or the
 * PWA build pipeline, so this config stays separate from vite.config.ts and
 * the run starts instantly.
 *
 * `node` is deliberate: it has WebCrypto (crypto.subtle) built in, which is
 * all lib/crypto and lib/account need, and it keeps anything that quietly
 * reaches for `window` or `document` honest — those modules stay out of the
 * suite rather than being propped up with a fake DOM.
 */
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
});

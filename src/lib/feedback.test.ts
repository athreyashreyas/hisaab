import { describe, expect, it } from 'vitest';
import {
  composeFeedback,
  describeDevice,
  FEEDBACK_KINDS,
  feedbackError,
  MAX_FEEDBACK_LENGTH,
  type FeedbackContext,
} from './feedback';

const ctx: FeedbackContext = {
  version: '0.10.1',
  account: 'noor@example.com',
  device: 'iPhone, installed to the home screen',
  sentAt: '15 March 2026, 9:04 pm',
};

describe('composeFeedback', () => {
  it('leads with the sender words and puts the details underneath', () => {
    const { body } = composeFeedback('bug', 'The balance stayed put.', ctx);
    expect(body.startsWith('The balance stayed put.')).toBe(true);
    expect(body).toContain('---');
  });

  it('names the app, the version and the kind in the subject', () => {
    expect(composeFeedback('bug', 'x', ctx).subject).toBe('Hisaab 0.10.1 · Bug report');
    expect(composeFeedback('idea', 'x', ctx).subject).toBe('Hisaab 0.10.1 · Feature idea');
  });

  it('carries the version, the device and the time the sender would remember', () => {
    const { body } = composeFeedback('idea', 'A thought.', ctx);
    expect(body).toContain('Hisaab 0.10.1');
    expect(body).toContain('iPhone, installed to the home screen');
    expect(body).toContain('Sent 15 March 2026, 9:04 pm');
  });

  it('says where a reply will land, and nudges the creator to use it', () => {
    const { body } = composeFeedback('bug', 'x', ctx);
    expect(body).toContain('From noor@example.com');
    expect(body).toContain('Replying to this email reaches them.');
  });

  it('says so plainly when there is nobody to reply to', () => {
    const { body } = composeFeedback('bug', 'x', { ...ctx, account: null });
    expect(body).toContain('Not signed in');
    expect(body).not.toContain('Replying to this email');
  });

  it('trims the sender own whitespace without touching their line breaks', () => {
    const { body } = composeFeedback('bug', '  \n first line\nsecond line \n ', ctx);
    expect(body.startsWith('first line\nsecond line\n\n---')).toBe(true);
  });

  it('carries no figure from the ledger', () => {
    // A message is the sender's own words; the ledger it was written about
    // stays sealed.
    const { body } = composeFeedback('bug', 'Something is off.', ctx);
    expect(body).not.toMatch(/₹/);
  });

  it('ends with a newline, so the footer is not glued to the mail chrome', () => {
    expect(composeFeedback('bug', 'x', ctx).body.endsWith('\n')).toBe(true);
  });
});

describe('feedbackError', () => {
  it('is silent once the message says enough to act on', () => {
    expect(feedbackError('The transfer screen crashes.')).toBeNull();
  });

  it('asks for a line or two when the box is empty', () => {
    expect(feedbackError('')).toBe('Write a line or two first.');
    expect(feedbackError('   \n  ')).toBe('Write a line or two first.');
  });

  it('nudges for a few more words when the message is too short to act on', () => {
    expect(feedbackError('hm')).toMatch(/few more words/);
    // The floor is measured on the trimmed message, not on what was typed.
    expect(feedbackError('  ok  ')).toMatch(/few more words/);
    expect(feedbackError('bugs')).toBeNull();
  });

  it('asks for a trim only once the message is genuinely a document', () => {
    expect(feedbackError('x'.repeat(MAX_FEEDBACK_LENGTH))).toBeNull();
    expect(feedbackError('x'.repeat(MAX_FEEDBACK_LENGTH + 1))).toContain(
      String(MAX_FEEDBACK_LENGTH)
    );
  });

  it('reads as an invitation rather than a telling-off', () => {
    for (const message of ['', 'hm', 'x'.repeat(MAX_FEEDBACK_LENGTH + 1)]) {
      expect(feedbackError(message)).not.toMatch(/error|invalid|must|required/i);
    }
  });
});

describe('FEEDBACK_KINDS', () => {
  it('gives each kind a tab label, a subject, a prompt and a placeholder', () => {
    for (const kind of ['bug', 'idea'] as const) {
      const copy = FEEDBACK_KINDS[kind];
      expect(copy.label.length).toBeGreaterThan(0);
      expect(copy.subject.length).toBeGreaterThan(0);
      expect(copy.prompt.length).toBeGreaterThan(0);
      expect(copy.placeholder.length).toBeGreaterThan(0);
    }
  });
});

describe('describeDevice', () => {
  const UA = {
    iphone: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X)',
    ipad: 'Mozilla/5.0 (iPad; CPU OS 17_5 like Mac OS X)',
    android: 'Mozilla/5.0 (Linux; Android 14; Pixel 8)',
    mac: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    windows: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    linux: 'Mozilla/5.0 (X11; Linux x86_64)',
  };

  it('names the platform in words rather than a user-agent string', () => {
    expect(describeDevice(UA.iphone, false)).toBe('iPhone, in the browser');
    expect(describeDevice(UA.ipad, false)).toBe('iPad, in the browser');
    expect(describeDevice(UA.android, false)).toBe('Android, in the browser');
    expect(describeDevice(UA.mac, false)).toBe('Mac, in the browser');
    expect(describeDevice(UA.windows, false)).toBe('Windows, in the browser');
    expect(describeDevice(UA.linux, false)).toBe('Linux, in the browser');
  });

  it('says whether the app is installed or running in a tab', () => {
    expect(describeDevice(UA.mac, true)).toBe('Mac, installed to the home screen');
  });

  it('calls Android Android, even though its user-agent says Linux', () => {
    // The Android string contains "Linux"; order is what keeps this right.
    expect(describeDevice(UA.android, false)).toContain('Android');
  });

  it('calls an iPad an iPad, not an iPhone', () => {
    expect(describeDevice(UA.ipad, false)).toContain('iPad');
  });

  it('shrugs rather than guessing at something it does not recognise', () => {
    expect(describeDevice('curl/8.4.0', false)).toBe('an unrecognised device, in the browser');
    expect(describeDevice('', false)).toContain('an unrecognised device');
  });
});

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Bug, Lightbulb, Check, CloudOff, Send } from 'lucide-react';
import { BottomSheet } from '../ui/BottomSheet';
import { Button } from '../ui/Button';
import { useSendFeedback } from '../../hooks/useSendFeedback';
import {
  FEEDBACK_KINDS,
  MAX_FEEDBACK_LENGTH,
  feedbackError,
  type FeedbackKind,
} from '../../lib/feedback';

interface FeedbackSheetProps {
  /** The kind to open on, or null when the sheet is closed. */
  kind: FeedbackKind | null;
  onClose: () => void;
}

/** The counter stays out of sight until the end is actually in view. */
const COUNTER_FROM = Math.round(MAX_FEEDBACK_LENGTH * 0.8);

/**
 * Writing to the creator, from Settings.
 *
 * The sheet is built around one promise it has to keep: that a message
 * genuinely goes somewhere. So it has two endings and neither is a shrug. It
 * went, or it is saved and will go on its own. Both say plainly what happened
 * and what comes next.
 */
export function FeedbackSheet({ kind, onClose }: FeedbackSheetProps) {
  const open = kind !== null;
  const { state, account, send, reset } = useSendFeedback();

  const [active, setActive] = useState<FeedbackKind>('bug');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);

  // Every opening starts clean, on whichever kind was tapped in Settings.
  useEffect(() => {
    if (!kind) return;
    setActive(kind);
    setMessage('');
    setError(null);
    reset();
  }, [kind, reset]);

  const copy = FEEDBACK_KINDS[active];
  const sending = state === 'sending';

  async function handleSend() {
    const problem = feedbackError(message);
    setError(problem);
    if (problem) return;
    const outcome = await send(active, message);
    if (outcome === 'failed') {
      setError(
        'That could not be saved on this device just now. Your words are still here, so please try again.'
      );
    }
  }

  function chooseKind(next: FeedbackKind) {
    setActive(next);
    setError(null);
  }

  return (
    <BottomSheet open={open} onClose={onClose} title="Make Hisaab yours">
      {state === 'sent' || state === 'queued' ? (
        <Delivered queued={state === 'queued'} account={account} onClose={onClose} />
      ) : (
        <div className="space-y-4 px-5 py-4">
          <div className="flex gap-1.5 rounded-card bg-parchment-200 p-1">
            <KindTab
              active={active === 'bug'}
              onClick={() => chooseKind('bug')}
              icon={<Bug size={14} />}
              label={FEEDBACK_KINDS.bug.label}
            />
            <KindTab
              active={active === 'idea'}
              onClick={() => chooseKind('idea')}
              icon={<Lightbulb size={14} />}
              label={FEEDBACK_KINDS.idea.label}
            />
          </div>

          <p className="text-sm text-ink-500">{copy.prompt}</p>

          <div>
            <textarea
              value={message}
              onChange={(e) => {
                setMessage(e.target.value);
                if (error) setError(null);
              }}
              rows={6}
              maxLength={MAX_FEEDBACK_LENGTH + 200}
              placeholder={copy.placeholder}
              aria-label={copy.label}
              className="w-full resize-none rounded-card border-0 bg-parchment-50 px-3.5 py-2.5 text-sm leading-relaxed text-ink-900 ring-1 ring-inset ring-parchment-300 transition-shadow placeholder:text-ink-300 focus:ring-2 focus:ring-inset focus:ring-teal-500"
            />
            {message.length > COUNTER_FROM && (
              <p className="mt-1.5 text-right text-xs tabular-nums text-ink-300">
                {MAX_FEEDBACK_LENGTH - message.trim().length} left
              </p>
            )}
          </div>

          <p className="text-xs leading-relaxed text-ink-500">
            This reaches the person who writes Hisaab. Your ledger is not attached
            to it and stays where it is.
            {account ? ` Replies land at ${account}.` : ''}
          </p>

          {/* A line is always held here, so an error arriving never shoves the
              button out from under a thumb already on its way to it. */}
          <p className="min-h-5 text-sm text-rose-600">{error}</p>

          <Button block size="lg" onClick={handleSend} disabled={sending}>
            <Send size={16} />
            {sending ? 'Sending' : 'Send it over'}
          </Button>
        </div>
      )}
    </BottomSheet>
  );
}

/**
 * The moment the promise is kept, either way it went. "Thanks for your
 * feedback!" tells somebody nothing, so this says where the message is, who
 * reads it, and what happens next.
 */
function Delivered({
  queued,
  account,
  onClose,
}: {
  queued: boolean;
  account: string | null;
  onClose: () => void;
}) {
  return (
    <div className="px-5 py-4">
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 380, damping: 32 }}
        className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full ${
          queued ? 'bg-parchment-200' : 'bg-teal-500'
        }`}
      >
        {queued ? (
          <CloudOff size={24} className="text-ink-500" />
        ) : (
          <Check size={26} strokeWidth={2.5} className="text-white" />
        )}
      </motion.div>

      <p className="text-center font-serif text-xl text-ink-900">
        {queued ? 'Held here, and it will go on its own.' : 'It has reached them.'}
      </p>

      <div className="mx-auto mt-3 max-w-sm space-y-2.5 text-center text-sm text-ink-500">
        {queued ? (
          <p>
            There was no connection just now, so it is sitting on your device.
            Hisaab sends it as soon as you are back online, even if you never
            open the app again.
          </p>
        ) : (
          <p>
            Your version and the kind of device you are on went with it, so they
            can picture the screen you were looking at.
          </p>
        )}
        <p>
          Hisaab is written and looked after by one person. They read everything
          that arrives, and reply when there is something useful to say. A good
          deal of the app started as a message like this one.
        </p>
        {account && (
          <p>
            Replies come to{' '}
            <span className="font-medium text-ink-700">{account}</span>.
          </p>
        )}
        <p className="text-ink-300">Thank you for the time it took to write.</p>
      </div>

      <Button block size="lg" variant="secondary" className="mt-5" onClick={onClose}>
        Close
      </Button>
    </div>
  );
}

function KindTab({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex flex-1 items-center justify-center gap-1.5 rounded-[9px] py-2 text-xs font-semibold transition-colors ${
        active ? 'bg-parchment-50 text-ink-900 shadow-sm' : 'text-ink-500'
      }`}
    >
      {icon}
      {label}
    </button>
  );
}

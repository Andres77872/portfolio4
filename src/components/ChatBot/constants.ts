// DOM ids shared by the dialog, its title, the disclosure and the composer counter.
export const PANEL_ID = 'portfolio-assistant';
export const TITLE_ID = 'chat-title';
export const DISCLOSURE_ID = 'chat-disclosure';
export const COUNTER_ID = 'chat-count';
export const COMPOSER_ID = 'chat-composer';

// Layout queries (read once through useMediaQuery; CSS keys off data attributes).
export const SHEET_QUERY = '(max-width: 575.98px), (max-height: 519.98px)';
export const SHORT_QUERY = '(max-height: 359.98px)';
export const COARSE_POINTER_QUERY = '(pointer: coarse)';
export const EXPAND_QUERY = '(min-width: 992px) and (pointer: fine)';

// Input and history limits.
export const MAX_INPUT_CHARS = 2000;
export const COUNTER_FROM = 1600;
export const HISTORY_BUDGET = { maxMessages: 12, maxChars: 12_000 } as const;
/** A 400 is treated as "conversation too long" only once the history is at least this long. */
export const TOO_LONG_MIN_HISTORY = 6;

// Streaming.
export const IDLE_TIMEOUT_MS = 45_000;
export const DELTA_FLUSH_MS = 40;

// Project cards under completed answers.
export const SHOW_PROJECT_CARDS = true;
export const MAX_CARDS_PER_TURN = 2;

// Screen reader announcements.
export const ANNOUNCE_REPLY_TEXT = true;
export const REPLY_ANNOUNCE_MAX_CHARS = 400;

export const DISCLOSURE_TEXT =
  "Answers are AI-generated and can be wrong. Messages go to an external AI service — don't share personal or sensitive info.";

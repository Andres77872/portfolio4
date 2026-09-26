import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ChatServiceError } from '@/services/chatService';

import { ERROR_COPY, toChatErrorKind } from './chatErrors';
import type { ChatErrorKind } from './conversation';

const ctx = (received = false, historyLength = 1) => ({ received, historyLength });

const KINDS: ChatErrorKind[] = [
  'offline',
  'unavailable',
  'rate-limited',
  'too-long',
  'timeout',
  'bad-response',
  'interrupted',
  'empty',
];

describe('toChatErrorKind', () => {
  let consoleError: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('is offline when the browser reports no connection', () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);

    expect(toChatErrorKind(new ChatServiceError('x', { status: 429 }), ctx())).toBe('offline');
  });

  it('maps config errors to unavailable and always logs them', () => {
    const error = new ChatServiceError('Missing VITE_CHAT_PORTFOLIO_AGENT_ID.', { kind: 'config' });

    expect(toChatErrorKind(error, ctx())).toBe('unavailable');
    expect(consoleError).toHaveBeenCalledWith(error);
  });

  it('maps 429 to rate-limited', () => {
    expect(toChatErrorKind(new ChatServiceError('x', { status: 429 }), ctx())).toBe('rate-limited');
  });

  it('maps 413 to too-long', () => {
    expect(toChatErrorKind(new ChatServiceError('x', { status: 413 }), ctx())).toBe('too-long');
  });

  it('maps 400 to too-long only with a long history', () => {
    expect(toChatErrorKind(new ChatServiceError('x', { status: 400 }), ctx(false, 8))).toBe('too-long');
    expect(toChatErrorKind(new ChatServiceError('x', { status: 400 }), ctx(false, 1))).toBe('unavailable');
  });

  it('maps parse errors by whether text arrived', () => {
    const error = new ChatServiceError('x', { kind: 'parse' });

    expect(toChatErrorKind(error, ctx(false))).toBe('bad-response');
    expect(toChatErrorKind(error, ctx(true))).toBe('interrupted');
  });

  it('maps a network TypeError to unavailable', () => {
    expect(toChatErrorKind(new TypeError('Failed to fetch'), ctx())).toBe('unavailable');
  });

  it('maps a 503 after partial text to interrupted', () => {
    expect(toChatErrorKind(new ChatServiceError('x', { status: 503 }), ctx(true))).toBe('interrupted');
  });

  it('maps upstream and no-body errors like any other failure', () => {
    expect(toChatErrorKind(new ChatServiceError('x', { kind: 'upstream' }), ctx(true))).toBe('interrupted');
    expect(toChatErrorKind(new ChatServiceError('x', { kind: 'no-body' }), ctx())).toBe('unavailable');
  });

  it('recognises service errors by name, so module mocks do not break classification', () => {
    const lookalike = Object.assign(new Error('x'), { name: 'ChatServiceError', status: 429 });

    expect(toChatErrorKind(lookalike, ctx())).toBe('rate-limited');
  });
});

describe('ERROR_COPY', () => {
  it('has copy for every kind', () => {
    for (const kind of KINDS) {
      expect(ERROR_COPY[kind].title).toBeTruthy();
      expect(ERROR_COPY[kind].detail).toBeTruthy();
      expect(ERROR_COPY[kind].actions.length).toBeGreaterThan(0);
    }
  });

  it('never exposes technical wording', () => {
    for (const { title, detail } of Object.values(ERROR_COPY)) {
      expect(`${title} ${detail}`).not.toMatch(/status|VITE_|SyntaxError|fetch/i);
    }
  });

  it('offers only a new chat for too-long conversations', () => {
    expect(ERROR_COPY['too-long'].actions).toEqual(['new-chat']);
  });
});

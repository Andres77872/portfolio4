import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import {
  ASK_ASSISTANT_EVENT,
  __resetAssistantAvailabilityForTests,
  askAssistant,
  isAssistantAvailable,
  subscribeAskAssistant,
} from './assistant';

describe('askAssistant bridge', () => {
  it('dispatches the ask event with its detail', () => {
    const listener = vi.fn();
    window.addEventListener(ASK_ASSISTANT_EVENT, listener);

    askAssistant({ projectSlug: 'findit' });
    window.removeEventListener(ASK_ASSISTANT_EVENT, listener);

    expect(ASK_ASSISTANT_EVENT).toBe('portfolio:ask-assistant');
    expect((listener.mock.calls[0][0] as CustomEvent).detail).toEqual({ projectSlug: 'findit' });
  });

  it('delivers details to subscribers until they unsubscribe', () => {
    const handler = vi.fn();
    const unsubscribe = subscribeAskAssistant(handler);

    askAssistant();
    askAssistant({ projectSlug: 'findit' });
    unsubscribe();
    askAssistant({ projectSlug: 'yellow-rooms' });

    expect(handler.mock.calls).toEqual([[{}], [{ projectSlug: 'findit' }]]);
  });

  it('passes only a string project slug through', () => {
    const handler = vi.fn();
    const unsubscribe = subscribeAskAssistant(handler);

    window.dispatchEvent(new CustomEvent(ASK_ASSISTANT_EVENT, { detail: { projectSlug: 42, extra: true } }));
    window.dispatchEvent(new CustomEvent(ASK_ASSISTANT_EVENT));
    unsubscribe();

    expect(handler.mock.calls).toEqual([[{}], [{}]]);
  });
});

describe('isAssistantAvailable', () => {
  let warn: ReturnType<typeof vi.spyOn>;

  beforeEach(() => {
    warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    vi.stubEnv('VITE_CHATBOT_AGENT_MODEL', '');
    vi.stubEnv('VITE_CHAT_MATRIX_RPG_AGENT_ID', '');
    vi.stubEnv('VITE_MATRIX_RPG_AGENT_MODEL', '');
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('is false, with a single warning, when the agent id is missing', () => {
    vi.stubEnv('VITE_CHAT_PORTFOLIO_AGENT_ID', '');

    expect(isAssistantAvailable()).toBe(false);
    expect(isAssistantAvailable()).toBe(false);
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn.mock.calls[0][0]).toMatch(/^\[portfolio-assistant\] disabled: Missing VITE_CHAT_PORTFOLIO_AGENT_ID/);
  });

  it('is true when the agent id is set', () => {
    vi.stubEnv('VITE_CHAT_PORTFOLIO_AGENT_ID', 'agt-test');

    expect(isAssistantAvailable()).toBe(true);
    expect(warn).not.toHaveBeenCalled();
  });

  it('is memoized until reset', () => {
    vi.stubEnv('VITE_CHAT_PORTFOLIO_AGENT_ID', 'agt-test');
    expect(isAssistantAvailable()).toBe(true);

    vi.stubEnv('VITE_CHAT_PORTFOLIO_AGENT_ID', '');
    expect(isAssistantAvailable()).toBe(true);

    __resetAssistantAvailabilityForTests();
    expect(isAssistantAvailable()).toBe(false);
  });
});

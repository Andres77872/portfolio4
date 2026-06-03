import { describe, expect, it } from 'vitest';

import { CHAT_CONSUMERS, resolveChatServiceConfig } from './chatConfig';

describe('resolveChatServiceConfig', () => {
  it('uses the default chat endpoint when no endpoint override exists', () => {
    const config = resolveChatServiceConfig({
      VITE_CHAT_PORTFOLIO_AGENT_ID: 'agt-portfolio',
      VITE_CHAT_MATRIX_RPG_AGENT_ID: 'agt-matrix',
    });

    expect(config.endpoint).toBe('https://llm.arz.ai/v1/completions');
  });

  it('uses the configured endpoint override', () => {
    const config = resolveChatServiceConfig({
      VITE_CHAT_API_URL: 'https://example.test/completion',
      VITE_CHAT_PORTFOLIO_AGENT_ID: 'agt-portfolio',
      VITE_CHAT_MATRIX_RPG_AGENT_ID: 'agt-matrix',
    });

    expect(config.endpoint).toBe('https://example.test/completion');
  });

  it('maps distinct per-consumer agent/model identifiers', () => {
    const config = resolveChatServiceConfig({
      VITE_CHAT_PORTFOLIO_AGENT_ID: 'agt-portfolio',
      VITE_CHAT_MATRIX_RPG_AGENT_ID: 'agt-matrix',
    });

    expect(config.consumers[CHAT_CONSUMERS.PORTFOLIO_ASSISTANT].model).toBe('agt-portfolio');
    expect(config.consumers[CHAT_CONSUMERS.MATRIX_RPG].model).toBe('agt-matrix');
  });

  it('falls MatrixRPG back to the portfolio model only when no distinct ID is configured', () => {
    const config = resolveChatServiceConfig({
      VITE_CHAT_PORTFOLIO_AGENT_ID: 'agt-shared-safe-default',
    });

    expect(config.consumers[CHAT_CONSUMERS.MATRIX_RPG].model).toBe('agt-shared-safe-default');
  });

  it('fails clearly before a request can be sent when no model fallback exists', () => {
    expect(() => resolveChatServiceConfig({})).toThrow(/Missing VITE_CHAT_PORTFOLIO_AGENT_ID/);
  });
});

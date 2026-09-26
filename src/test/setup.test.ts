import { describe, expect, it, vi } from 'vitest';

describe('test setup', () => {
  it('blocks network requests', async () => {
    await expect(fetch('https://llm.arz.ai/v1/completions', { method: 'POST' })).rejects.toThrow(
      'Unexpected network request in tests: https://llm.arz.ai/v1/completions',
    );
  });

  it('restores the guard, not real fetch, after vi.unstubAllGlobals()', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('stubbed')));
    await expect((await fetch('https://example.test/')).text()).resolves.toBe('stubbed');

    vi.unstubAllGlobals();

    await expect(fetch('https://example.test/')).rejects.toThrow('Unexpected network request in tests');
  });

  it('stubs the DOM APIs jsdom lacks', () => {
    expect(typeof ResizeObserver).toBe('function');
    expect(typeof Element.prototype.scrollIntoView).toBe('function');
    expect(typeof Element.prototype.scrollTo).toBe('function');
    expect(window.matchMedia('(prefers-reduced-motion: reduce)').matches).toBe(false);
    expect(window.visualViewport ?? undefined).toBeUndefined();
  });
});

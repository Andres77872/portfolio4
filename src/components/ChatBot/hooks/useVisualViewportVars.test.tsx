import { renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { useVisualViewportVars } from './useVisualViewportVars';

class FakeVisualViewport extends EventTarget {
  height = 700;
  offsetTop = 0;
}

describe('useVisualViewportVars', () => {
  afterEach(() => {
    Reflect.deleteProperty(window, 'visualViewport');
  });

  it('is a no-op where visualViewport is missing', () => {
    const target = document.createElement('div');
    renderHook(() => useVisualViewportVars({ current: target }, true));
    expect(target.style.getPropertyValue('--chat-vvh')).toBe('');
  });

  it('tracks the visual viewport while active and removes the variables after', async () => {
    const viewport = new FakeVisualViewport();
    Object.defineProperty(window, 'visualViewport', { value: viewport, configurable: true });
    const target = document.createElement('div');

    const { rerender } = renderHook(({ active }) => useVisualViewportVars({ current: target }, active), {
      initialProps: { active: true },
    });
    expect(target.style.getPropertyValue('--chat-vvh')).toBe('700px');
    expect(target.style.getPropertyValue('--chat-vvt')).toBe('0px');

    // The on-screen keyboard opens: the visual viewport shrinks and scrolls.
    viewport.height = 420;
    viewport.offsetTop = 30;
    viewport.dispatchEvent(new Event('resize'));
    viewport.dispatchEvent(new Event('scroll'));
    await waitFor(() => expect(target.style.getPropertyValue('--chat-vvh')).toBe('420px'));
    expect(target.style.getPropertyValue('--chat-vvt')).toBe('30px');

    rerender({ active: false });
    expect(target.style.getPropertyValue('--chat-vvh')).toBe('');
    expect(target.style.getPropertyValue('--chat-vvt')).toBe('');
  });
});

import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { useInitialHashScroll } from './useInitialHashScroll';

describe('useInitialHashScroll', () => {
  afterEach(() => {
    vi.useRealTimers();
    window.history.replaceState(null, '', '/');
    document.body.innerHTML = '';
  });

  it('scrolls the hash target into view after the first render', () => {
    vi.useFakeTimers();
    const section = document.createElement('section');
    section.id = 'about';
    section.scrollIntoView = vi.fn();
    document.body.append(section);
    window.history.replaceState(null, '', '/#about');

    renderHook(() => useInitialHashScroll());
    expect(section.scrollIntoView).not.toHaveBeenCalled();

    vi.runAllTimers();
    expect(section.scrollIntoView).toHaveBeenCalledWith({ block: 'start', behavior: 'instant' });
  });

  it('does nothing without a hash or a matching element', () => {
    vi.useFakeTimers();
    window.history.replaceState(null, '', '/#missing');
    renderHook(() => useInitialHashScroll());
    expect(() => vi.runAllTimers()).not.toThrow();
  });
});

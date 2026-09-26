import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { SHEET_QUERY } from '@/components/ChatBot/constants';
import { mockMatchMedia } from '@/test/media';

import { useMediaQuery } from './useMediaQuery';

describe('useMediaQuery', () => {
  it('reports the current match and follows changes', () => {
    const media = mockMatchMedia({ sheet: false });
    const { result } = renderHook(() => useMediaQuery(SHEET_QUERY));
    expect(result.current).toBe(false);

    act(() => media.set({ sheet: true }));
    expect(result.current).toBe(true);
  });

  it('is false when matchMedia is unavailable', () => {
    const original = window.matchMedia;
    // @ts-expect-error -- simulating an environment without matchMedia
    delete window.matchMedia;
    try {
      const { result } = renderHook(() => useMediaQuery(SHEET_QUERY));
      expect(result.current).toBe(false);
    } finally {
      window.matchMedia = original;
    }
  });
});

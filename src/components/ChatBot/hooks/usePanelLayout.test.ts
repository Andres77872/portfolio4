import { act, renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { mockMatchMedia } from '@/test/media';

import { usePanelLayout } from './usePanelLayout';

describe('usePanelLayout', () => {
  it('is a floating, fine-pointer panel by default', () => {
    const { result } = renderHook(() => usePanelLayout());
    expect(result.current).toEqual({ layout: 'floating', short: false, coarse: false, canExpand: false });
  });

  it('offers "Larger panel" only for the floating layout', () => {
    mockMatchMedia({ expand: true });
    expect(renderHook(() => usePanelLayout()).result.current.canExpand).toBe(true);

    mockMatchMedia({ expand: true, sheet: true });
    expect(renderHook(() => usePanelLayout()).result.current).toMatchObject({ layout: 'sheet', canExpand: false });
  });

  it('reports a short sheet only when the sheet query matches too', () => {
    mockMatchMedia({ short: true });
    expect(renderHook(() => usePanelLayout()).result.current).toMatchObject({ layout: 'floating', short: false });

    mockMatchMedia({ short: true, sheet: true, coarse: true });
    expect(renderHook(() => usePanelLayout()).result.current).toEqual({
      layout: 'sheet',
      short: true,
      coarse: true,
      canExpand: false,
    });
  });

  it('follows media query changes without remounting', () => {
    const media = mockMatchMedia();
    const { result } = renderHook(() => usePanelLayout());
    expect(result.current.layout).toBe('floating');

    act(() => media.set({ sheet: true }));
    expect(result.current.layout).toBe('sheet');

    act(() => media.set({ sheet: false }));
    expect(result.current.layout).toBe('floating');
  });
});

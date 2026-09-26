import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';

import { readSearchParam, useSearchParam, writeSearchParams } from './useSearchParam';

afterEach(() => {
    window.history.replaceState(null, '', '/');
});

describe('writeSearchParams', () => {
    it('sets and deletes params while keeping the hash', () => {
        window.history.replaceState(null, '', '/?keep=1#projects');

        writeSearchParams({ project: 'findit', empty: '' });
        expect(window.location.search).toBe('?keep=1&project=findit');
        expect(window.location.hash).toBe('#projects');

        writeSearchParams({ project: null });
        expect(readSearchParam('project')).toBeNull();
        expect(readSearchParam('keep')).toBe('1');
    });

    it('pushes a history entry only in push mode', () => {
        const before = window.history.length;
        writeSearchParams({ a: '1' });
        expect(window.history.length).toBe(before);

        writeSearchParams({ a: '2' }, { mode: 'push', state: { marker: true } });
        expect(window.history.length).toBe(before + 1);
        expect(window.history.state).toEqual({ marker: true });
    });
});

describe('useSearchParam', () => {
    it('re-renders when the param changes', () => {
        const { result } = renderHook(() => useSearchParam('category'));
        expect(result.current).toBeNull();

        act(() => writeSearchParams({ category: 'agents-llm' }));
        expect(result.current).toBe('agents-llm');

        act(() => writeSearchParams({ category: null }));
        expect(result.current).toBeNull();
    });
});

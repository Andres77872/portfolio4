import { useSyncExternalStore } from 'react';

/**
 * Minimal URL-as-state helpers. Query params hold shareable UI state (open project,
 * active filters) without a router; the hash stays free for section anchors.
 */

const CHANGE_EVENT = 'portfolio:searchparams';

const subscribe = (onChange: () => void) => {
    window.addEventListener('popstate', onChange);
    window.addEventListener(CHANGE_EVENT, onChange);
    return () => {
        window.removeEventListener('popstate', onChange);
        window.removeEventListener(CHANGE_EVENT, onChange);
    };
};

export const readSearchParam = (name: string): string | null =>
    new URLSearchParams(window.location.search).get(name);

export interface WriteSearchParamsOptions {
    /** `push` adds a history entry (Back undoes it); `replace` edits the current one. */
    mode?: 'push' | 'replace';
    /** History state for the written entry. Defaults to the current state. */
    state?: unknown;
}

/** Sets (or, for null/empty values, deletes) query params and notifies subscribers. */
export const writeSearchParams = (
    updates: Record<string, string | null | undefined>,
    { mode = 'replace', state }: WriteSearchParamsOptions = {},
): void => {
    const url = new URL(window.location.href);
    for (const [name, value] of Object.entries(updates)) {
        if (value) url.searchParams.set(name, value);
        else url.searchParams.delete(name);
    }

    if (url.href === window.location.href) return;

    const nextState = state === undefined ? window.history.state : state;
    if (mode === 'push') window.history.pushState(nextState, '', url);
    else window.history.replaceState(nextState, '', url);
    window.dispatchEvent(new Event(CHANGE_EVENT));
};

export function useSearchParam(name: string): string | null {
    return useSyncExternalStore(
        subscribe,
        () => readSearchParam(name),
        () => null,
    );
}

export default useSearchParam;

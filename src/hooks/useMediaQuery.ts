import { useCallback, useMemo, useSyncExternalStore } from 'react';

const noop = () => undefined;

/** Live `matchMedia` result; `false` during SSR or where `matchMedia` is unavailable. */
export function useMediaQuery(query: string): boolean {
  const list = useMemo(
    () => (typeof window !== 'undefined' && typeof window.matchMedia === 'function' ? window.matchMedia(query) : null),
    [query],
  );

  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!list) return noop;
      list.addEventListener('change', onChange);
      return () => list.removeEventListener('change', onChange);
    },
    [list],
  );

  return useSyncExternalStore(
    subscribe,
    () => list?.matches ?? false,
    () => false,
  );
}

export default useMediaQuery;

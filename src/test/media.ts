import {
  COARSE_POINTER_QUERY,
  EXPAND_QUERY,
  SHEET_QUERY,
  SHORT_QUERY,
} from '@/components/ChatBot/constants';

export const REDUCED_MOTION_QUERY = '(prefers-reduced-motion: reduce)';

export interface MediaFlags {
  sheet?: boolean;
  short?: boolean;
  coarse?: boolean;
  reducedMotion?: boolean;
  expand?: boolean;
}

export interface MatchMediaController {
  /** Updates the flags and fires `change` on every list whose result changed. */
  set(flags: MediaFlags): void;
}

const QUERY_FLAGS: Record<string, keyof MediaFlags> = {
  [SHEET_QUERY]: 'sheet',
  [SHORT_QUERY]: 'short',
  [COARSE_POINTER_QUERY]: 'coarse',
  [REDUCED_MOTION_QUERY]: 'reducedMotion',
  [EXPAND_QUERY]: 'expand',
};

type Listener = (event: MediaQueryListEvent) => void;

/**
 * Installs a controllable `window.matchMedia`. Known queries (the chat layout queries and
 * reduced motion) follow `flags`; every other query is `false`.
 */
export function mockMatchMedia(initial: MediaFlags = {}): MatchMediaController {
  let flags: MediaFlags = { ...initial };
  const listeners = new Map<string, Set<Listener>>();

  const evaluate = (query: string): boolean => {
    const flag = QUERY_FLAGS[query.trim()];
    return flag ? Boolean(flags[flag]) : false;
  };

  const listenersFor = (query: string) => {
    let set = listeners.get(query);
    if (!set) {
      set = new Set();
      listeners.set(query, set);
    }
    return set;
  };

  window.matchMedia = (query: string): MediaQueryList => {
    const list = {
      media: query,
      onchange: null,
      get matches() {
        return evaluate(query);
      },
      addEventListener: (_type: string, listener: Listener) => listenersFor(query).add(listener),
      removeEventListener: (_type: string, listener: Listener) => listenersFor(query).delete(listener),
      addListener: (listener: Listener) => listenersFor(query).add(listener),
      removeListener: (listener: Listener) => listenersFor(query).delete(listener),
      dispatchEvent: () => false,
    };
    return list as unknown as MediaQueryList;
  };

  return {
    set(next) {
      const before = new Map(Array.from(listeners.keys(), (query) => [query, evaluate(query)]));
      flags = { ...flags, ...next };
      for (const [query, set] of listeners) {
        const matches = evaluate(query);
        if (matches === before.get(query)) continue;
        const event = { matches, media: query } as MediaQueryListEvent;
        for (const listener of Array.from(set)) listener(event);
      }
    },
  };
}

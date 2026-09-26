/**
 * discovery.ts — the optional, non-required "restore PROJECT MIRROR" progression.
 *
 * Everything here is pure. State is a set of recovered fragment ids plus a set of
 * narrative flags. Reading fragment files and running scan/decrypt/connect mutate
 * it through reduceDiscovery; deriveStatus turns it into the live `status` bars;
 * buildExplorationContext feeds continuity to the Unknown Entity. Ignore all of it
 * and the terminal still works exactly as before.
 */

import type { ChatRequestMessage } from '../../components/ChatBot/types';

export type DiscoveryFlag = 'scanned' | 'decrypt-03' | 'mirror-restored';

export const FRAGMENT_IDS = ['frag-01', 'frag-02', 'frag-03'] as const;
export const TOTAL_FRAGMENTS = FRAGMENT_IDS.length;

export interface DiscoveredState {
  fragments: Set<string>;
  flags: Set<DiscoveryFlag>;
}

export type DiscoveryEvent =
  | { type: 'read-fragment'; id: string }
  | { type: 'scan' }
  | { type: 'decrypt'; flag: DiscoveryFlag; fragmentId?: string }
  | { type: 'restore' };

export const createDiscovered = (): DiscoveredState => ({
  fragments: new Set(),
  flags: new Set(),
});

export function reduceDiscovery(prev: DiscoveredState, event: DiscoveryEvent): DiscoveredState {
  const fragments = new Set(prev.fragments);
  const flags = new Set(prev.flags);

  switch (event.type) {
    case 'read-fragment':
      fragments.add(event.id);
      break;
    case 'scan':
      flags.add('scanned');
      break;
    case 'decrypt':
      flags.add(event.flag);
      if (event.fragmentId) fragments.add(event.fragmentId);
      break;
    case 'restore':
      flags.add('mirror-restored');
      break;
  }

  return { fragments, flags };
}

/** All three fragments recovered — the prerequisite for `connect`/`restore`. */
export const canRestore = (d: DiscoveredState): boolean =>
  FRAGMENT_IDS.every((id) => d.fragments.has(id));

export const isRestored = (d: DiscoveredState): boolean => d.flags.has('mirror-restored');

const clamp = (n: number, min = 0, max = 100): number => Math.max(min, Math.min(max, n));

export interface DerivedStatus {
  neural: number;
  memory: number;
  consciousness: number;
  mirror: number;
  entityStable: boolean;
  fragments: number;
  total: number;
}

export function deriveStatus(d: DiscoveredState): DerivedStatus {
  const frags = [...d.fragments].filter((id) => (FRAGMENT_IDS as readonly string[]).includes(id)).length;
  const scanned = d.flags.has('scanned');
  const restored = isRestored(d);

  return {
    neural: restored ? 100 : clamp(58 + (scanned ? 10 : 0) + frags * 8, 0, 96),
    memory: restored ? 100 : clamp(23 + frags * 18),
    consciousness: restored ? 100 : clamp(frags * 12 + (scanned ? 4 : 0), 0, 90),
    mirror: restored ? 100 : frags >= TOTAL_FRAGMENTS ? 60 : frags * 8,
    entityStable: restored,
    fragments: frags,
    total: TOTAL_FRAGMENTS,
  };
}

/**
 * Continuity message injected as an extra system turn so the Entity's tone tracks
 * exploration. Injected AFTER the history slice so it never counts against the
 * conversation window and never lands between the stream marker and its text.
 */
export function buildExplorationContext(d: DiscoveredState): ChatRequestMessage {
  const status = deriveStatus(d);
  const recovered = status.fragments;
  const restored = isRestored(d);

  return {
    role: 'system',
    content: `EXPLORATION STATE (continuity only; never recite verbatim):
- Memory fragments recovered: ${recovered}/${TOTAL_FRAGMENTS}${recovered ? ` (${[...d.fragments].join(', ')})` : ''}.
- Deep scan run: ${d.flags.has('scanned') ? 'yes' : 'no'}.
- Encrypted fragment unsealed: ${d.flags.has('decrypt-03') ? 'yes' : 'no'}.
- MIRROR restored: ${restored ? 'yes' : 'no'}.
- Estimated memory integrity: ~${status.memory}%.
TONE: When few fragments are recovered you are confused, fragmented, losing words mid-sentence. As integrity rises you become steadier and more lucid. If MIRROR is restored you are calm, whole, and at peace${restored ? '' : ' (not yet)'}.`,
  };
}

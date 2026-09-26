import { describe, expect, it } from 'vitest';

import {
  buildExplorationContext,
  canRestore,
  createDiscovered,
  deriveStatus,
  isRestored,
  reduceDiscovery,
  type DiscoveredState,
  type DiscoveryFlag,
} from './discovery';

const withFragments = (ids: string[], flags: DiscoveryFlag[] = []): DiscoveredState => ({
  fragments: new Set(ids),
  flags: new Set(flags),
});

describe('reduceDiscovery', () => {
  it('is immutable and records each event type', () => {
    const base = createDiscovered();
    const read = reduceDiscovery(base, { type: 'read-fragment', id: 'frag-01' });
    expect(base.fragments.size).toBe(0);
    expect(read.fragments.has('frag-01')).toBe(true);

    const decrypted = reduceDiscovery(read, { type: 'decrypt', flag: 'decrypt-03', fragmentId: 'frag-03' });
    expect(decrypted.flags.has('decrypt-03')).toBe(true);
    expect(decrypted.fragments.has('frag-03')).toBe(true);

    expect(reduceDiscovery(base, { type: 'scan' }).flags.has('scanned')).toBe(true);
    expect(reduceDiscovery(base, { type: 'restore' }).flags.has('mirror-restored')).toBe(true);
  });
});

describe('deriveStatus', () => {
  it('rises monotonically as fragments and flags accumulate', () => {
    const none = deriveStatus(createDiscovered());
    const some = deriveStatus(withFragments(['frag-01', 'frag-02']));
    const all = deriveStatus(withFragments(['frag-01', 'frag-02', 'frag-03'], ['scanned']));
    expect(some.memory).toBeGreaterThan(none.memory);
    expect(all.memory).toBeGreaterThan(some.memory);
    expect(all.neural).toBeGreaterThanOrEqual(some.neural);
  });

  it('reads all-100 and stable once restored', () => {
    const restored = deriveStatus(withFragments([], ['mirror-restored']));
    expect(restored.neural).toBe(100);
    expect(restored.memory).toBe(100);
    expect(restored.mirror).toBe(100);
    expect(restored.entityStable).toBe(true);
  });
});

describe('objective gating', () => {
  it('requires all three fragments to restore', () => {
    expect(canRestore(withFragments(['frag-01', 'frag-02']))).toBe(false);
    expect(canRestore(withFragments(['frag-01', 'frag-02', 'frag-03']))).toBe(true);
    expect(isRestored(withFragments([], ['mirror-restored']))).toBe(true);
  });
});

describe('buildExplorationContext', () => {
  it('produces a system message that reflects progress', () => {
    const message = buildExplorationContext(withFragments(['frag-01']));
    expect(message.role).toBe('system');
    expect(message.content).toContain('1/3');
  });
});

import { describe, expect, it } from 'vitest';

import { HOME, getNode, listDir, readFile, resolvePath } from './vfs';
import { createDiscovered, reduceDiscovery } from './discovery';

describe('resolvePath', () => {
  it('resolves ~, absolute, relative and .. segments', () => {
    expect(resolvePath(HOME, '~')).toBe('/mirror');
    expect(resolvePath(HOME, 'fragments')).toBe('/mirror/fragments');
    expect(resolvePath('/mirror/fragments', '..')).toBe('/mirror');
    expect(resolvePath(HOME, '/etc')).toBe('/etc');
    expect(resolvePath('/mirror/logs', '../fragments/fragment-01.txt')).toBe('/mirror/fragments/fragment-01.txt');
    expect(resolvePath('/mirror', '~/logs')).toBe('/mirror/logs');
  });
});

describe('getNode / listDir', () => {
  it('finds directories and files, returns null for missing paths', () => {
    expect(getNode('/mirror')?.type).toBe('dir');
    expect(getNode('/mirror/README.txt')?.type).toBe('file');
    expect(getNode('/nope/here')).toBeNull();
  });

  it('lists directory entries dirs-first and hides dotfiles by default', () => {
    const names = listDir('/mirror')?.map((node) => node.name) ?? [];
    expect(names).toContain('fragments');
    expect(names).toContain('README.txt');
    // fragments (dir) sorts before README.txt (file)
    expect(names.indexOf('fragments')).toBeLessThan(names.indexOf('README.txt'));

    const home = listDir('/home/root') ?? [];
    expect(home.some((node) => node.name === '.neurosh_history')).toBe(false);
    const homeHidden = listDir('/home/root', true) ?? [];
    expect(homeHidden.some((node) => node.name === '.neurosh_history')).toBe(true);
  });
});

describe('readFile', () => {
  it('reads plaintext fragments and reports their fragment id', () => {
    const result = readFile('/mirror/fragments/fragment-01.txt', createDiscovered());
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.garbled).toBe(false);
      expect(result.fragmentId).toBe('frag-01');
    }
  });

  it('garbles an encrypted file until it is decrypted (and grants no fragment while sealed)', () => {
    const sealed = readFile('/mirror/fragments/fragment-03.enc', createDiscovered());
    expect(sealed.ok).toBe(true);
    if (sealed.ok) {
      expect(sealed.garbled).toBe(true);
      expect(sealed.fragmentId).toBeUndefined();
    }

    const decrypted = reduceDiscovery(createDiscovered(), { type: 'decrypt', flag: 'decrypt-03', fragmentId: 'frag-03' });
    const opened = readFile('/mirror/fragments/fragment-03.enc', decrypted);
    expect(opened.ok).toBe(true);
    if (opened.ok) {
      expect(opened.garbled).toBe(false);
      expect(opened.fragmentId).toBe('frag-03');
    }
  });

  it('locks entity.core until MIRROR is restored', () => {
    const locked = readFile('/mirror/entity.core', createDiscovered());
    expect(locked).toEqual({ ok: false, reason: 'locked' });

    const restored = reduceDiscovery(createDiscovered(), { type: 'restore' });
    expect(readFile('/mirror/entity.core', restored).ok).toBe(true);
  });

  it('reports directories and missing files', () => {
    expect(readFile('/mirror', createDiscovered())).toEqual({ ok: false, reason: 'is-dir' });
    expect(readFile('/mirror/nope.txt', createDiscovered())).toEqual({ ok: false, reason: 'not-found' });
  });
});

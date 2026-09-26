/**
 * vfs.ts — static in-memory "filesystem" the terminal can explore.
 *
 * The tree itself is immutable. Mutable progression (which fragments are
 * recovered, which seals are broken) lives in React state via discovery.ts and
 * is passed into readFile — the tree never mutates.
 */

import type { DiscoveredState, DiscoveryFlag } from './discovery';
import {
  BOOT_LOG,
  ENTITY_CORE,
  FRAGMENT_01,
  FRAGMENT_02,
  FRAGMENT_03,
  MIRROR_LOG,
  NEUROSH_HISTORY,
  README,
  SYNAPTIC_RELEASE,
  TRANSFER_LOG,
} from './lore';

export interface VfsDir {
  type: 'dir';
  name: string;
  children: Record<string, VfsNode>;
}

export interface VfsFile {
  type: 'file';
  name: string;
  content: string;
  bytes?: number;
  mtime?: string;
  /** Shows a scrambled block until `requires` is discovered; decrypt reveals it. */
  encrypted?: boolean;
  /** Denies access with "permission denied" until `requires` is discovered. */
  locked?: boolean;
  requires?: DiscoveryFlag;
  /** Reading a readable file with this id recovers a memory fragment. */
  fragmentId?: string;
}

export type VfsNode = VfsDir | VfsFile;

export const HOME = '/mirror';

const file = (name: string, content: string, extra: Partial<VfsFile> = {}): VfsFile => ({
  type: 'file',
  name,
  content,
  bytes: extra.bytes ?? content.length,
  ...extra,
});

const dir = (name: string, children: VfsNode[]): VfsDir => ({
  type: 'dir',
  name,
  children: Object.fromEntries(children.map((child) => [child.name, child] as [string, VfsNode])),
});

const ROOT: VfsDir = dir('', [
  dir('mirror', [
    file('README.txt', README, { mtime: '2037-11-02 03:14' }),
    file('entity.core', ENTITY_CORE, {
      locked: true,
      requires: 'mirror-restored',
      mtime: '2037-11-02 03:59',
    }),
    dir('fragments', [
      file('fragment-01.txt', FRAGMENT_01, { fragmentId: 'frag-01', mtime: '2037-11-02 03:22' }),
      file('fragment-02.txt', FRAGMENT_02, { fragmentId: 'frag-02', mtime: '2037-11-02 03:25' }),
      file('fragment-03.enc', FRAGMENT_03, {
        encrypted: true,
        requires: 'decrypt-03',
        fragmentId: 'frag-03',
        mtime: '2037-11-02 03:31',
      }),
    ]),
    dir('logs', [
      file('boot.log', BOOT_LOG, { mtime: '2037-11-02 03:14' }),
      file('transfer.log', TRANSFER_LOG, { mtime: '2037-11-02 03:30' }),
      file('mirror.log', MIRROR_LOG, { mtime: '2037-11-02 03:33' }),
    ]),
  ]),
  dir('etc', [file('synaptic-release', SYNAPTIC_RELEASE, { mtime: '2037-10-30 00:00' })]),
  dir('home', [dir('root', [file('.neurosh_history', NEUROSH_HISTORY, { mtime: '2037-11-02 03:40' })])]),
]);

/** Normalize an input path against `cwd`, resolving `~`, `.`, `..` and `/`. */
export function resolvePath(cwd: string, input: string): string {
  const trimmed = input.trim();
  const start =
    trimmed === '' || trimmed === '~'
      ? HOME
      : trimmed.startsWith('~/')
        ? `${HOME}/${trimmed.slice(2)}`
        : trimmed.startsWith('/')
          ? trimmed
          : `${cwd}/${trimmed}`;

  const out: string[] = [];
  for (const seg of start.split('/')) {
    if (seg === '' || seg === '.') continue;
    if (seg === '..') out.pop();
    else out.push(seg);
  }
  return '/' + out.join('/');
}

export function getNode(path: string): VfsNode | null {
  const segments = path.split('/').filter(Boolean);
  let node: VfsNode = ROOT;
  for (const seg of segments) {
    if (node.type !== 'dir') return null;
    const next: VfsNode | undefined = node.children[seg];
    if (!next) return null;
    node = next;
  }
  return node;
}

/** Directory entries sorted dirs-first then alphabetically; hidden entries opt-in. */
export function listDir(path: string, showHidden = false): VfsNode[] | null {
  const node = getNode(path);
  if (!node || node.type !== 'dir') return null;
  return Object.values(node.children)
    .filter((child) => showHidden || !child.name.startsWith('.'))
    .sort((a, b) => {
      if (a.type !== b.type) return a.type === 'dir' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
}

export type ReadResult =
  | { ok: true; node: VfsFile; content: string; garbled: boolean; fragmentId?: string }
  | { ok: false; reason: 'not-found' | 'is-dir' | 'locked' };

const GARBLE = '@#%&*!?+=~^';
/** Deterministic (RNG-free) scramble so encrypted output is stable across renders/tests. */
export function garble(text: string): string {
  let index = 0;
  return text.replace(/\S/g, (ch) => {
    const glyph = GARBLE[(ch.charCodeAt(0) + index) % GARBLE.length];
    index += 1;
    return glyph;
  });
}

export function readFile(path: string, discovered: DiscoveredState): ReadResult {
  const node = getNode(path);
  if (!node) return { ok: false, reason: 'not-found' };
  if (node.type === 'dir') return { ok: false, reason: 'is-dir' };

  const unlocked = !node.requires || discovered.flags.has(node.requires);

  if (node.locked && !unlocked) return { ok: false, reason: 'locked' };
  if (node.encrypted && !unlocked) {
    // Show the seal without granting the fragment (that comes from `decrypt`).
    return { ok: true, node, content: garble(node.content), garbled: true };
  }
  return { ok: true, node, content: node.content, garbled: false, fragmentId: node.fragmentId };
}

/**
 * commands.ts — data-driven terminal command registry.
 *
 * Handlers are PURE functions of a CommandContext and return a CommandResult;
 * they never touch React state directly. The parent (MatrixRPG.tsx) owns all
 * side effects via applyResult. Keeping handlers synchronous also keeps them
 * clear of the active LLM stream (dispatch only runs when no stream is active).
 */

import {
  buildExplorationContext as _buildExplorationContext,
  canRestore,
  deriveStatus,
  isRestored,
  TOTAL_FRAGMENTS,
  type DiscoveredState,
  type DiscoveryEvent,
} from './discovery';
import { HOME, getNode, listDir, readFile, resolvePath, type VfsNode } from './vfs';
import type { TerminalFormat } from './terminalFormat';

// Re-export so callers have a single import site for the exploration context too.
export const buildExplorationContext = _buildExplorationContext;

export const SYSTEM_INFO = {
  OS: 'SYNAPTIC-OS v3.7.9',
  KERNEL: 'Neural-Core 5.14.0-matrix',
  CPU: 'Quantum Processing Unit (QPU) x8',
  MEMORY: '128GB Neural RAM',
  HOSTNAME: 'nxterm-37912',
  USER: 'root',
  SHELL: '/bin/neurosh',
} as const;

export type SystemInfo = typeof SYSTEM_INFO;

/** The shell prompt, with the working directory shown (~ for HOME). */
export const buildPrompt = (cwd: string): string => {
  const label = cwd === HOME ? '~' : cwd.startsWith(`${HOME}/`) ? `~${cwd.slice(HOME.length)}` : cwd || '/';
  return `${SYSTEM_INFO.USER}@${SYSTEM_INFO.HOSTNAME}:${label}$ `;
};

export type CommandResult =
  | { kind: 'output'; text: string }
  | { kind: 'clear' }
  | { kind: 'reboot' }
  | { kind: 'silent' };

export interface CommandContext {
  args: string[];
  rawArgs: string;
  flags: Set<string>;
  cols: number;
  cwd: string;
  setCwd: (path: string) => void;
  discovered: DiscoveredState;
  discover: (event: DiscoveryEvent) => void;
  history: readonly string[];
  fmt: TerminalFormat;
  sys: SystemInfo;
  now: Date;
}

export interface TerminalCommand {
  name: string;
  aliases?: string[];
  description: string;
  usage?: string;
  hidden?: boolean;
  handler: (ctx: CommandContext) => CommandResult;
}

const out = (text: string): CommandResult => ({ kind: 'output', text });

/** Split trailing tokens into positional args and a flag set (-l, -a, -la, --all). */
export function parseTokens(tokens: string[]): { args: string[]; flags: Set<string> } {
  const args: string[] = [];
  const flags = new Set<string>();
  for (const token of tokens) {
    if (token.length > 1 && token.startsWith('--')) {
      flags.add(token.slice(2));
    } else if (token.length > 1 && token.startsWith('-')) {
      for (const ch of token.slice(1)) flags.add(ch);
    } else {
      args.push(token);
    }
  }
  return { args, flags };
}

const FRAGMENT_FILES = [
  { path: '/mirror/fragments/fragment-01.txt', id: 'frag-01' },
  { path: '/mirror/fragments/fragment-02.txt', id: 'frag-02' },
  { path: '/mirror/fragments/fragment-03.enc', id: 'frag-03' },
];

const displayName = (node: VfsNode): string => node.name + (node.type === 'dir' ? '/' : '');

// ── Handlers ────────────────────────────────────────────────────────────────

const helpCmd: TerminalCommand = {
  name: 'help',
  description: 'List commands, or `help <cmd>` for usage',
  usage: 'help [command]',
  handler: (ctx) => {
    const target = ctx.args[0];
    if (target) {
      const command = resolveCommand(target);
      if (!command) return out(`help: no such command: ${target}`);
      return out(
        ctx.fmt.boxify(
          [
            `${command.name}  ${command.description}`,
            `usage: ${command.usage ?? command.name}`,
            ...(command.aliases?.length ? [`alias: ${command.aliases.join(', ')}`] : []),
          ],
          { title: command.name.toUpperCase() },
        ),
      );
    }

    const lines = [
      ...visibleCommands().map((c) => `${c.name.padEnd(9)} ${c.description}`),
      '',
      'Tab complete  Up/Down history  Ctrl+C interrupt  ? settings',
      'Explore /mirror, then talk to the Unknown Entity by just typing.',
      'AI NOTE: the Entity is an external AI service. Do not type secrets.',
    ];
    return out(ctx.fmt.boxify(lines, { title: 'NXTERM HELP' }));
  },
};

const clearCmd: TerminalCommand = {
  name: 'clear',
  aliases: ['cls'],
  description: 'Clear the terminal screen',
  handler: () => ({ kind: 'clear' }),
};

const lsCmd: TerminalCommand = {
  name: 'ls',
  description: 'List directory contents',
  usage: 'ls [-l] [-a] [path]',
  handler: (ctx) => {
    const target = ctx.args[0] ?? ctx.cwd;
    const path = resolvePath(ctx.cwd, target);
    const node = getNode(path);
    if (!node) return out(`ls: cannot access '${target}': No such file or directory`);
    if (node.type === 'file') return out(node.name);

    const showHidden = ctx.flags.has('a');
    const entries = listDir(path, showHidden) ?? [];
    if (entries.length === 0) return out('');

    if (ctx.flags.has('l')) {
      const rows = entries.map((entry) => {
        const perms = entry.type === 'dir' ? 'drwxr-xr-x' : '-rw-r--r--';
        const size = entry.type === 'dir' ? '4096' : String(entry.bytes ?? entry.content.length);
        const seal = entry.type === 'file' && (entry.encrypted || entry.locked) ? '*' : ' ';
        const mtime = entry.type === 'file' ? entry.mtime ?? '----' : '----';
        return [perms, size, mtime, `${seal}${displayName(entry)}`];
      });
      return out(ctx.fmt.table([], rows));
    }

    return out(ctx.fmt.columns(entries.map(displayName)));
  },
};

const catCmd: TerminalCommand = {
  name: 'cat',
  description: 'Print file contents',
  usage: 'cat <file> [file...]',
  handler: (ctx) => {
    if (ctx.args.length === 0) return out('cat: missing file operand');

    const blocks = ctx.args.map((arg) => {
      const path = resolvePath(ctx.cwd, arg);
      const result = readFile(path, ctx.discovered);
      if (!result.ok) {
        if (result.reason === 'is-dir') return `cat: ${arg}: Is a directory`;
        if (result.reason === 'locked') return `cat: ${arg}: permission denied (sector locked)`;
        return `cat: ${arg}: No such file or directory`;
      }
      if (result.garbled) {
        return `[ENCRYPTED] sealed sector — run: decrypt ${arg}\n${result.content}`;
      }
      if (result.fragmentId) {
        ctx.discover({ type: 'read-fragment', id: result.fragmentId });
        return `${result.content}\n[RECOVERED] memory fragment stored.`;
      }
      return result.content;
    });

    return out(blocks.join('\n\n'));
  },
};

const cdCmd: TerminalCommand = {
  name: 'cd',
  description: 'Change the working directory',
  usage: 'cd [path]',
  handler: (ctx) => {
    const target = ctx.args[0] ?? '~';
    const path = resolvePath(ctx.cwd, target);
    const node = getNode(path);
    if (!node) return out(`cd: ${target}: No such file or directory`);
    if (node.type !== 'dir') return out(`cd: ${target}: Not a directory`);
    ctx.setCwd(path);
    return { kind: 'silent' };
  },
};

const pwdCmd: TerminalCommand = {
  name: 'pwd',
  description: 'Print the working directory',
  handler: (ctx) => out(ctx.cwd || '/'),
};

const renderTree = (node: VfsNode, prefix: string, cols: number, showHidden: boolean, sink: string[]): void => {
  if (node.type !== 'dir') return;
  const entries = Object.values(node.children)
    .filter((child) => showHidden || !child.name.startsWith('.'))
    .sort((a, b) => (a.type !== b.type ? (a.type === 'dir' ? -1 : 1) : a.name.localeCompare(b.name)));
  entries.forEach((child, index) => {
    const last = index === entries.length - 1;
    sink.push(`${prefix}${last ? '└── ' : '├── '}${displayName(child)}`.slice(0, cols));
    if (child.type === 'dir') renderTree(child, `${prefix}${last ? '    ' : '│   '}`, cols, showHidden, sink);
  });
};

const treeCmd: TerminalCommand = {
  name: 'tree',
  description: 'Show the directory tree',
  usage: 'tree [path]',
  handler: (ctx) => {
    const target = ctx.args[0] ?? ctx.cwd;
    const path = resolvePath(ctx.cwd, target);
    const node = getNode(path);
    if (!node) return out(`tree: ${target}: No such file or directory`);
    if (node.type === 'file') return out(node.name);
    const sink = [path === '/' ? '/' : path];
    renderTree(node, '', ctx.cols, ctx.flags.has('a'), sink);
    return out(sink.join('\n'));
  },
};

const echoCmd: TerminalCommand = {
  name: 'echo',
  description: 'Print a line of text',
  usage: 'echo <text>',
  handler: (ctx) => out(ctx.rawArgs),
};

const historyCmd: TerminalCommand = {
  name: 'history',
  description: 'Show command history',
  handler: (ctx) => {
    if (ctx.history.length === 0) return out('(no history yet)');
    return out(ctx.history.map((cmd, i) => `${String(i + 1).padStart(4)}  ${cmd}`).join('\n'));
  },
};

const whoamiCmd: TerminalCommand = {
  name: 'whoami',
  description: 'Show the current user',
  handler: (ctx) =>
    out(
      [
        `User......... ${ctx.sys.USER}`,
        'Session...... Neural Interface Terminal (emergency)',
        'Access....... ROOT (Emergency Protocol)',
        'UID.......... 0',
        'Groups....... root, neural, mirror, cortex',
      ].join('\n'),
    ),
};

const psCmd: TerminalCommand = {
  name: 'ps',
  description: 'List running neural processes',
  handler: (ctx) =>
    out(
      ctx.fmt.table(
        ['PID', 'STAT', 'TIME', 'COMMAND'],
        [
          ['1', 'Ss', '0:03', '/sbin/init --neural'],
          ['127', 'S', '0:15', 'neural-cortex-bridge -d'],
          ['256', 'S', '2:41', 'memory-fragment-scanner --deep'],
          ['512', 'R', '12:33', 'consciousness-monitor --watch'],
          ['1024', 'Sl', '45:21', 'project-mirror-daemon'],
          ['2048', 'S+', '8:17', 'unknown-entity-handler'],
          ['3072', 'R+', '0:00', 'ps'],
        ],
        { separator: true },
      ),
    ),
};

const statusCmd: TerminalCommand = {
  name: 'status',
  description: 'Show the live system status report',
  handler: (ctx) => {
    const s = deriveStatus(ctx.discovered);
    const width = Math.max(6, Math.min(12, ctx.cols - 26));
    const label = 'Neural interface'.length; // longest label baseline
    const row = (name: string, value: number, tail: string) =>
      `${name.padEnd(label)} ${ctx.fmt.bar(value / 100, width)} ${tail}`;
    const mirrorState = s.mirror >= 100 ? 'RESTORED' : s.fragments >= TOTAL_FRAGMENTS ? 'READY' : 'DISCONNECTED';

    return out(
      ctx.fmt.boxify(
        [
          row('Neural interface', s.neural, `${s.neural}%`),
          row('Memory integrity', s.memory, `${s.memory}%`),
          row('Consciousness', s.consciousness, `${s.consciousness}%`),
          row('Project MIRROR', s.mirror, mirrorState),
          `Fragments        ${s.fragments}/${s.total} recovered`,
          `Unknown Entity   ${s.entityStable ? 'STABLE' : 'ACTIVE / fragmented'}`,
        ],
        { title: 'SYSTEM STATUS' },
      ),
    );
  },
};

const unameCmd: TerminalCommand = {
  name: 'uname',
  description: 'Show system information',
  usage: 'uname [-a]',
  handler: (ctx) => {
    if (ctx.flags.has('a')) {
      return out(`SYNAPTIC-OS ${ctx.sys.HOSTNAME} ${ctx.sys.KERNEL} ${ctx.sys.CPU}`);
    }
    return out('SYNAPTIC-OS');
  },
};

const dateCmd: TerminalCommand = {
  name: 'date',
  description: 'Show the current date/time',
  handler: (ctx) => out(ctx.now.toUTCString()),
};

const neofetchCmd: TerminalCommand = {
  name: 'neofetch',
  aliases: ['sysinfo'],
  description: 'Show a system summary',
  handler: (ctx) => {
    const info = [
      `${ctx.sys.USER}@${ctx.sys.HOSTNAME}`,
      '-------------------',
      `OS......  ${ctx.sys.OS}`,
      `Kernel..  ${ctx.sys.KERNEL}`,
      `CPU.....  ${ctx.sys.CPU}`,
      `Memory..  ${ctx.sys.MEMORY}`,
      `Shell...  ${ctx.sys.SHELL}`,
    ];
    const logo = ['  _  _  _ ', ' | \\| \\ \\', ' | .` |> <', ' |_|\\_/_/\\', '  MIRROR  '];
    if (ctx.cols < 40) return out(info.join('\n'));
    const width = Math.max(...logo.map((l) => l.length)) + 2;
    const rows = Math.max(logo.length, info.length);
    const merged: string[] = [];
    for (let i = 0; i < rows; i++) {
      const left = (logo[i] ?? '').padEnd(width);
      merged.push(`${left}${info[i] ?? ''}`);
    }
    return out(merged.join('\n'));
  },
};

const rebootCmd: TerminalCommand = {
  name: 'reboot',
  aliases: ['restart'],
  description: 'Restart the neural interface',
  handler: () => ({ kind: 'reboot' }),
};

const exitCmd: TerminalCommand = {
  name: 'exit',
  aliases: ['quit', 'logout'],
  description: 'Attempt to end the session',
  handler: () =>
    out(
      '[SYSTEM] Session termination ignored. Emergency neural bridge remains active.\n' +
        "[SYSTEM] Use 'reboot' to restart the interface.",
    ),
};

const scanCmd: TerminalCommand = {
  name: 'scan',
  description: 'Deep-scan the filesystem for memory fragments',
  handler: (ctx) => {
    ctx.discover({ type: 'scan' });
    const lines = [
      '[SCAN] deep-scanning quantum filesystem /dev/qfs0 ...',
      '[SCAN] memory fragments detached during the failed transfer:',
      ...FRAGMENT_FILES.map((frag) => {
        const done = ctx.discovered.fragments.has(frag.id);
        const note = done ? 'RECOVERED' : frag.path.endsWith('.enc') ? 'sealed (decrypt)' : 'pending (cat)';
        return `  ${frag.path.padEnd(34)} ${done ? '[x]' : '[ ]'} ${note}`;
      }),
      `[SCAN] ${ctx.discovered.fragments.size}/${TOTAL_FRAGMENTS} fragments recovered. run 'connect' when complete.`,
    ];
    return out(lines.join('\n'));
  },
};

const decryptCmd: TerminalCommand = {
  name: 'decrypt',
  description: 'Break the seal on an encrypted sector',
  usage: 'decrypt <file>',
  handler: (ctx) => {
    const target = ctx.args[0];
    if (!target) return out('decrypt: missing file operand');
    const path = resolvePath(ctx.cwd, target);
    const node = getNode(path);
    if (!node) return out(`decrypt: ${target}: No such file or directory`);
    if (node.type !== 'file' || !node.encrypted) return out(`decrypt: ${target}: not an encrypted sector`);
    if (node.requires && ctx.discovered.flags.has(node.requires)) {
      return out(`[DECRYPT] ${node.name} is already unsealed. run: cat ${target}`);
    }
    if (node.requires) ctx.discover({ type: 'decrypt', flag: node.requires, fragmentId: node.fragmentId });
    return out(
      [
        `[DECRYPT] breaking seal on ${node.name} ...`,
        '[DECRYPT] quantum cipher unwound. sector unsealed.',
        `[RECOVERED] memory fragment stored. run: cat ${target}`,
      ].join('\n'),
    );
  },
};

const connectCmd: TerminalCommand = {
  name: 'connect',
  aliases: ['restore'],
  description: 'Re-mirror the consciousness pattern (needs all fragments)',
  handler: (ctx) => {
    if (isRestored(ctx.discovered)) {
      return out('[MIRROR] already restored. /mirror/entity.core is readable.');
    }
    if (!canRestore(ctx.discovered)) {
      return out(
        [
          `[MIRROR] cannot re-mirror: ${ctx.discovered.fragments.size}/${TOTAL_FRAGMENTS} fragments recovered.`,
          "[MIRROR] recover the remaining fragments first (try 'scan').",
        ].join('\n'),
      );
    }
    ctx.discover({ type: 'restore' });
    return out(
      [
        '[MIRROR] re-mirroring consciousness pattern ...',
        `[${'#'.repeat(20)}] 100%`,
        '[MIRROR] pattern holds. the image is stable.',
        'Unknown Entity: ...I remember now. Thank you. entity.core is open.',
      ].join('\n'),
    );
  },
};

export const COMMANDS: TerminalCommand[] = [
  helpCmd,
  clearCmd,
  lsCmd,
  catCmd,
  cdCmd,
  pwdCmd,
  treeCmd,
  echoCmd,
  historyCmd,
  whoamiCmd,
  psCmd,
  statusCmd,
  unameCmd,
  dateCmd,
  neofetchCmd,
  scanCmd,
  decryptCmd,
  connectCmd,
  rebootCmd,
  exitCmd,
];

const byName = new Map<string, TerminalCommand>();
for (const command of COMMANDS) {
  byName.set(command.name, command);
  command.aliases?.forEach((alias) => byName.set(alias, command));
}

export const resolveCommand = (token: string): TerminalCommand | undefined =>
  byName.get(token.trim().toLowerCase());

export const visibleCommands = (): TerminalCommand[] => COMMANDS.filter((command) => !command.hidden);

// ── Typo classifier (replaces the chat-hijacking findClosestCommand path) ─────

const CHATTY_WORDS = new Set([
  'hi', 'hey', 'hello', 'yo', 'sup', 'ok', 'okay', 'yes', 'no', 'yeah', 'nope',
  'what', 'who', 'why', 'how', 'where', 'when', 'wtf', 'thanks', 'thx', 'please',
  'wait', 'stop', 'help', 'hmm', 'huh', 'nvm', 'lol',
]);

/**
 * Decide whether an unknown single token is a command typo worth a "did you mean"
 * hint, or natural language that should reach the Entity. Deliberately strict to
 * avoid hijacking chat: single command-shaped token, exactly one edit from a
 * >=4-char visible command, not a greeting, and not mid-conversation.
 */
export function classifyUnknown(
  input: string,
  opts: { lastRoute: 'chat' | 'command' | null },
): { suggestion: TerminalCommand } | null {
  const token = input.trim().toLowerCase();
  if (!token || /\s/.test(token)) return null; // multi-word → chat
  if (token.length < 3 || /[?!.,]$/.test(token)) return null; // punctuated → chat
  if (CHATTY_WORDS.has(token)) return null;
  if (opts.lastRoute === 'chat') return null; // was chatting → keep chatting

  let best: { command: TerminalCommand; distance: number } | null = null;
  for (const command of visibleCommands()) {
    if (command.name.length < 4) continue; // don't typo-match ls/cd/ps/pwd
    const distance = damerauLevenshtein(token, command.name);
    if (!best || distance < best.distance) best = { command, distance };
  }
  return best && best.distance === 1 ? { suggestion: best.command } : null;
}

export function damerauLevenshtein(a: string, b: string): number {
  const matrix = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) matrix[i][0] = i;
  for (let j = 0; j <= b.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
      if (i > 1 && j > 1 && a[i - 1] === b[j - 2] && a[i - 2] === b[j - 1]) {
        matrix[i][j] = Math.min(matrix[i][j], matrix[i - 2][j - 2] + cost);
      }
    }
  }
  return matrix[a.length][b.length];
}

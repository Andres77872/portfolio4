import { describe, expect, it } from 'vitest';

import {
  SYSTEM_INFO,
  buildPrompt,
  classifyUnknown,
  parseTokens,
  resolveCommand,
  visibleCommands,
  type CommandContext,
  type CommandResult,
} from './commands';
import { createDiscovered, type DiscoveredState, type DiscoveryEvent } from './discovery';
import { makeFormat } from './terminalFormat';

const makeCtx = (overrides: Partial<CommandContext> = {}): CommandContext => ({
  args: [],
  rawArgs: '',
  flags: new Set(),
  cols: 60,
  cwd: '/mirror',
  setCwd: () => undefined,
  discovered: createDiscovered(),
  discover: () => undefined,
  history: [],
  fmt: makeFormat(60),
  sys: SYSTEM_INFO,
  now: new Date(0),
  ...overrides,
});

const outputText = (result: CommandResult): string => {
  if (result.kind !== 'output') throw new Error(`expected output, got ${result.kind}`);
  return result.text;
};

const run = (name: string, overrides: Partial<CommandContext> = {}): CommandResult => {
  const command = resolveCommand(name);
  if (!command) throw new Error(`unknown command: ${name}`);
  return command.handler(makeCtx(overrides));
};

describe('parseTokens', () => {
  it('splits combined and long flags from positional args', () => {
    const { args, flags } = parseTokens(['-la', '--all', 'fragments']);
    expect(flags.has('l')).toBe(true);
    expect(flags.has('a')).toBe(true);
    expect(flags.has('all')).toBe(true);
    expect(args).toEqual(['fragments']);
  });
});

describe('resolveCommand', () => {
  it('resolves names and aliases case-insensitively', () => {
    expect(resolveCommand('LS')?.name).toBe('ls');
    expect(resolveCommand('cls')?.name).toBe('clear');
    expect(resolveCommand('restart')?.name).toBe('reboot');
    expect(resolveCommand('nope')).toBeUndefined();
  });

  it('exposes only non-hidden commands', () => {
    expect(visibleCommands().every((command) => !command.hidden)).toBe(true);
  });
});

describe('classifyUnknown (typo vs chat)', () => {
  it('suggests a command only for a lone one-edit typo', () => {
    expect(classifyUnknown('helo', { lastRoute: null })?.suggestion.name).toBe('help');
    expect(classifyUnknown('stauts', { lastRoute: null })?.suggestion.name).toBe('status');
  });

  it('routes natural language to the Entity', () => {
    expect(classifyUnknown('hello', { lastRoute: null })).toBeNull(); // greeting
    expect(classifyUnknown('who are you', { lastRoute: null })).toBeNull(); // multi-word
    expect(classifyUnknown('help?', { lastRoute: null })).toBeNull(); // punctuated
    expect(classifyUnknown('helo', { lastRoute: 'chat' })).toBeNull(); // mid-conversation
    expect(classifyUnknown('banana', { lastRoute: null })).toBeNull(); // not close to a command
  });
});

describe('buildPrompt', () => {
  it('shows ~ for home and the path elsewhere', () => {
    expect(buildPrompt('/mirror')).toBe(`${SYSTEM_INFO.USER}@${SYSTEM_INFO.HOSTNAME}:~$ `);
    expect(buildPrompt('/mirror/logs')).toBe(`${SYSTEM_INFO.USER}@${SYSTEM_INFO.HOSTNAME}:~/logs$ `);
    expect(buildPrompt('/etc')).toBe(`${SYSTEM_INFO.USER}@${SYSTEM_INFO.HOSTNAME}:/etc$ `);
  });
});

describe('command handlers', () => {
  it('ls lists directory contents with trailing slashes on dirs', () => {
    expect(outputText(run('ls', { args: ['/mirror'] }))).toContain('fragments/');
  });

  it('cat recovers a fragment and fires a discovery event', () => {
    const events: DiscoveryEvent[] = [];
    const text = outputText(
      run('cat', { args: ['/mirror/fragments/fragment-01.txt'], discover: (event) => events.push(event) }),
    );
    expect(events).toContainEqual({ type: 'read-fragment', id: 'frag-01' });
    expect(text).toContain('[RECOVERED]');
  });

  it('cd validates the target and updates the working directory', () => {
    let next = '';
    const result = run('cd', { args: ['fragments'], setCwd: (path) => (next = path) });
    expect(result.kind).toBe('silent');
    expect(next).toBe('/mirror/fragments');
    expect(run('cd', { args: ['README.txt'] }).kind).toBe('output'); // error: not a directory
  });

  it('decrypt unseals the encrypted fragment', () => {
    const events: DiscoveryEvent[] = [];
    run('decrypt', { args: ['/mirror/fragments/fragment-03.enc'], discover: (event) => events.push(event) });
    expect(events).toContainEqual({ type: 'decrypt', flag: 'decrypt-03', fragmentId: 'frag-03' });
  });

  it('status reflects live discovered state', () => {
    const restored: DiscoveredState = {
      fragments: new Set(['frag-01', 'frag-02', 'frag-03']),
      flags: new Set(['mirror-restored']),
    };
    expect(outputText(run('status', { discovered: restored }))).toContain('RESTORED');
    expect(outputText(run('status'))).toContain('DISCONNECTED');
  });

  it('clear and reboot return control results', () => {
    expect(run('clear').kind).toBe('clear');
    expect(run('reboot').kind).toBe('reboot');
  });
});

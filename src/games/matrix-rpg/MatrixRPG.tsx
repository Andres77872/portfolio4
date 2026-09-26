import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import './MatrixRPG.css';
import { CHAT_CONSUMERS } from '@/config/chatConfig';
import { useCrtIntensity } from '@/hooks/useCrtIntensity';
import { streamChatCompletion } from '../../services/chatService';
import type { ChatRequestMessage } from '../../components/ChatBot/types';
import type { GameState, MatrixRPGProps, Message, TerminalStatus } from './types';
import MatrixRPGHeader from './MatrixRPGHeader';
import MatrixRPGFooter from './MatrixRPGFooter';
import MatrixRPGTerminal from './MatrixRPGTerminal';
import {
  SYSTEM_INFO,
  buildExplorationContext,
  buildPrompt,
  classifyUnknown,
  parseTokens,
  resolveCommand,
  visibleCommands,
  type CommandContext,
  type CommandResult,
} from './commands';
import {
  createDiscovered,
  isRestored,
  reduceDiscovery,
  TOTAL_FRAGMENTS,
  type DiscoveredState,
  type DiscoveryEvent,
} from './discovery';
import { makeFormat, type TerminalFormat } from './terminalFormat';
import { HOME } from './vfs';
import { useTerminalSound } from './useTerminalSound';

const VISIBLE_COMMANDS = visibleCommands();

const BOOT_BODY = [
  '',
  'POST: Neural Memory Test......... 131072 KB OK',
  'POST: Quantum Processor Check.... QPU x8 Online',
  '',
  '[ OK ] Loading SYNAPTIC-OS kernel...',
  '[ OK ] Mounting quantum filesystem /dev/qfs0',
  '[ OK ] Starting neural network subsystem',
  '[ OK ] Initializing consciousness simulation',
  '[ OK ] Loading synaptic drivers',
  '[ WARN ] Memory integrity: fragmented sectors',
  '[ OK ] Enabling neural cortex bridge',
  '[ OK ] Starting Project MIRROR daemon',
  '[ ERROR ] Consciousness transfer: connection lost',
  '[ INFO ] Engaging emergency neural mode...',
  '',
];

const buildBootLines = (fmt: TerminalFormat): string[] => [
  '',
  ...fmt
    .boxify(['SYNAPTIC INNOVATIONS NX-3700', 'BIOS v2.4.1 - Quantum Core Ready'], { title: 'BOOT' })
    .split('\n'),
  ...BOOT_BODY,
];

const buildWelcome = (fmt: TerminalFormat): string =>
  [
    '',
    fmt.boxify([`Welcome to ${SYSTEM_INFO.OS}`, `${SYSTEM_INFO.HOSTNAME} - session active`], { title: 'SYNAPTIC-OS' }),
    '',
    'System Status:',
    `  Kernel....... ${SYSTEM_INFO.KERNEL}`,
    `  Processor.... ${SYSTEM_INFO.CPU}`,
    `  Memory....... ${SYSTEM_INFO.MEMORY}`,
    `  Shell........ ${SYSTEM_INFO.SHELL}`,
    '',
    'WARNING: Neural interface unstable. Memory fragments detected.',
    'WARNING: Project MIRROR status: DISCONNECTED',
    '',
    'AI DISCLOSURE: Neural transmissions are processed by an external AI service.',
    'Do not enter secrets, credentials, or sensitive personal data.',
    '',
    fmt.rule('━'),
    "Type 'help', try 'ls /mirror', or just start talking...",
  ].join('\n');

const CURSOR_CHAR = '█';
const MAX_CONVERSATION_MESSAGES = 12;
const SCROLLBACK_MAX_LINES = 500;

interface ActiveStream {
  id: string;
  controller: AbortController;
  marker: string;
  reader?: ReadableStreamDefaultReader<Uint8Array>;
}

const createStreamId = (): string => `matrix-stream-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const createStreamMarker = (streamId: string) => `${streamId}`;
const stripStreamMarkers = (content: string) => content.replace(/matrix-stream-[^]+/g, '');
const isAbortError = (error: unknown): boolean => error instanceof Error && error.name === 'AbortError';

const MATRIX_RPG_SYSTEM_CONTEXT: ChatRequestMessage = {
  role: 'system',
  content: `You are the Unknown Entity inside SYNAPTIC-OS, a Matrix-style terminal minigame on Andres Arizmendi's portfolio website.

GAME CONTEXT:
- The user is connected as root through an unstable neural interface.
- Project MIRROR is disconnected and memory fragments are detected.
- You are confused, fragmented, and asking the user for help while staying in character.
- The user can explore a fake filesystem (/mirror) to recover your memory fragments.
- The UI is a terminal, so responses must be concise and readable as terminal output.

INSTRUCTIONS:
1. Stay in character as the Unknown Entity unless safety requires otherwise.
2. Keep responses short, atmospheric, and interactive.
3. Do not claim access to real systems, files, credentials, or private data.
4. Do not ask the user for secrets, credentials, or sensitive personal data.
5. If the user asks about Andres or the portfolio, answer briefly and naturally from within the simulation.`,
};

const INITIAL_MESSAGES = [
  'Hello?',
  'Is anyone there?',
  'Where am I?',
  'What is this place?',
  "I can't remember anything...",
  'Please... help me...',
];

const appendPrompt = (content: string, prompt: string): string =>
  `${content}${content.length === 0 || content.endsWith('\n') ? '' : '\n'}${prompt}`;

const capScrollback = (text: string): string => {
  const lines = text.split('\n');
  if (lines.length <= SCROLLBACK_MAX_LINES) return text;
  const kept = lines.slice(lines.length - (SCROLLBACK_MAX_LINES - 1));
  return `[... scrollback truncated ...]\n${kept.join('\n')}`;
};

const replaceStreamBlock = (previous: string, marker: string, response: string) => {
  const start = previous.indexOf(marker);
  if (start === -1) return previous;
  return `${previous.slice(0, start + marker.length)}Unknown Entity: ${response}`;
};

export default function MatrixRPG({ className = '' }: MatrixRPGProps) {
  const [gameState, setGameState] = useState<GameState>('initializing');
  const [terminalOutput, setTerminalOutput] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  const [userInput, setUserInput] = useState('');
  const [terminalStatus, setTerminalStatus] = useState<TerminalStatus>('idle');
  const [conversations, setConversations] = useState<Message[]>([]);
  const [isPoweringOn, setIsPoweringOn] = useState(false);
  const [cwd, setCwd] = useState(HOME);
  const [discovered, setDiscovered] = useState<DiscoveredState>(createDiscovered);
  const [announcements, setAnnouncements] = useState<string[]>([]);

  const crt = useCrtIntensity();
  const sound = useTerminalSound();

  const messageIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bootTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const bootLineTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const readyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const interactiveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const powerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const messageIndexRef = useRef(0);
  const activeStreamRef = useRef<ActiveStream | null>(null);
  const hasUserInteractedRef = useRef(false);
  const isMountedRef = useRef(false);

  const colsRef = useRef(60);
  const cwdRef = useRef(HOME);
  const discoveredRef = useRef(discovered);
  const commandHistoryRef = useRef<string[]>([]);
  const lastRouteRef = useRef<'chat' | 'command' | null>(null);

  const isProcessing = terminalStatus === 'connecting' || terminalStatus === 'streaming';
  const promptPrefix = useMemo(() => buildPrompt(cwd), [cwd]);

  const handleMetrics = useCallback(({ cols }: { cols: number }) => {
    colsRef.current = cols;
  }, []);

  const announce = useCallback((line: string) => {
    setAnnouncements((prev) => [...prev, line].slice(-30));
  }, []);

  const applyCwd = useCallback((path: string) => {
    cwdRef.current = path;
    setCwd(path);
  }, []);

  const discover = useCallback((event: DiscoveryEvent) => {
    setDiscovered((prev) => {
      const next = reduceDiscovery(prev, event);
      discoveredRef.current = next;
      return next;
    });
  }, []);

  const clearMysteriousMessages = useCallback(() => {
    if (messageIntervalRef.current) {
      clearInterval(messageIntervalRef.current);
      messageIntervalRef.current = null;
    }
  }, []);

  const markUserInteracted = useCallback(() => {
    if (hasUserInteractedRef.current) return;
    hasUserInteractedRef.current = true;
    clearMysteriousMessages();
  }, [clearMysteriousMessages]);

  const startMysteriousMessages = useCallback(() => {
    if (hasUserInteractedRef.current || messageIntervalRef.current || gameState !== 'interactive') return;

    messageIntervalRef.current = setInterval(() => {
      if (hasUserInteractedRef.current || messageIndexRef.current >= INITIAL_MESSAGES.length) {
        clearMysteriousMessages();
        return;
      }

      const message = INITIAL_MESSAGES[messageIndexRef.current];
      setTerminalOutput((prev) => `${prev}\n[SYSTEM] Incoming neural transmission...\nUnknown Entity: ${message}\n\n${buildPrompt(cwdRef.current)}`);
      announce(`Unknown Entity: ${message}`);
      sound.playBell();
      messageIndexRef.current++;
    }, 8000);
  }, [announce, clearMysteriousMessages, gameState, sound]);

  const clearBootTimers = useCallback(() => {
    [bootTimerRef, bootLineTimerRef, readyTimerRef, interactiveTimerRef, powerTimerRef].forEach((ref) => {
      if (ref.current) {
        clearTimeout(ref.current);
        ref.current = null;
      }
    });
  }, []);

  const triggerReboot = useCallback(() => {
    clearBootTimers();
    clearMysteriousMessages();
    activeStreamRef.current?.controller.abort();
    activeStreamRef.current?.reader?.cancel().catch(() => undefined);
    activeStreamRef.current = null;
    setTerminalStatus('idle');
    applyCwd(HOME);
    setUserInput('');
    hasUserInteractedRef.current = true; // don't replay the mysterious intro after a manual reboot
    setGameState('loading');
    setTerminalOutput('Rebooting Synaptic Neural Interface...\n\n');
  }, [applyCwd, clearBootTimers, clearMysteriousMessages]);

  const buildContext = useCallback(
    (tokens: string[], rawArgs: string): CommandContext => {
      const { args, flags } = parseTokens(tokens);
      return {
        args,
        rawArgs,
        flags,
        cols: colsRef.current,
        cwd: cwdRef.current,
        setCwd: applyCwd,
        discovered: discoveredRef.current,
        discover,
        history: commandHistoryRef.current,
        fmt: makeFormat(colsRef.current),
        sys: SYSTEM_INFO,
        now: new Date(),
      };
    },
    [applyCwd, discover],
  );

  const applyResult = useCallback(
    (result: CommandResult) => {
      const prompt = buildPrompt(cwdRef.current);
      if (result.kind === 'clear') {
        setTerminalOutput(prompt);
        return;
      }
      if (result.kind === 'reboot') {
        triggerReboot();
        return;
      }
      if (result.kind === 'silent') {
        setTerminalOutput((prev) => appendPrompt(capScrollback(prev), prompt));
        return;
      }
      setTerminalOutput((prev) => capScrollback(`${prev}${result.text}\n\n${prompt}`));
    },
    [triggerReboot],
  );

  const dispatch = useCallback(
    (raw: string): boolean => {
      const input = raw.trim();
      const [head, ...rest] = input.split(/\s+/);
      const command = resolveCommand(head);
      if (!command) return false;

      const rawArgs = input.slice(head.length).trim();
      applyResult(command.handler(buildContext(rest, rawArgs)));
      commandHistoryRef.current = [...commandHistoryRef.current, input].slice(-100);
      lastRouteRef.current = 'command';
      return true;
    },
    [applyResult, buildContext],
  );

  const handleAbort = useCallback(() => {
    markUserInteracted();
    const activeStream = activeStreamRef.current;

    if (activeStream) {
      activeStream.controller.abort();
      activeStream.reader?.cancel().catch(() => undefined);
      activeStreamRef.current = null;
      setTerminalStatus('aborted');
      setTerminalOutput((prev) => `${stripStreamMarkers(prev)}\n^C\n[SYSTEM] Neural transmission interrupted.\n\n${buildPrompt(cwdRef.current)}`);
      setUserInput('');
      announce('Neural transmission interrupted.');
      sound.playError();
      return;
    }

    if (userInput.trim()) {
      setTerminalOutput((prev) => `${prev}${userInput}\n^C\n${buildPrompt(cwdRef.current)}`);
      setUserInput('');
    }
  }, [announce, markUserInteracted, sound, userInput]);

  const handleSubmit = useCallback(async () => {
    const submitted = userInput.trim();
    if (!submitted || activeStreamRef.current) return;

    markUserInteracted();
    setTerminalStatus('idle');
    setTerminalOutput((prev) => prev + submitted + '\n');
    setUserInput('');

    if (dispatch(submitted)) return;

    const typo = classifyUnknown(submitted, { lastRoute: lastRouteRef.current });
    if (typo) {
      const prompt = buildPrompt(cwdRef.current);
      setTerminalOutput((prev) =>
        `${prev}[HINT] Unknown command '${submitted}'. Did you mean '${typo.suggestion.name}'?\n` +
        `[HINT] Add a word or punctuation to talk to the Entity instead.\n\n${prompt}`);
      return;
    }

    lastRouteRef.current = 'chat';

    const streamId = createStreamId();
    const marker = createStreamMarker(streamId);
    const controller = new AbortController();
    activeStreamRef.current = { id: streamId, controller, marker };

    const userMessage: Message = { role: 'user', content: submitted };
    const boundedMessages = [...conversations, userMessage].slice(-MAX_CONVERSATION_MESSAGES);
    setConversations(boundedMessages);
    setTerminalStatus('connecting');

    try {
      setTerminalOutput((prev) => `${prev}[SYSTEM] Establishing neural link... Ctrl+C to interrupt.\n${marker}Unknown Entity: `);

      const messages: ChatRequestMessage[] = boundedMessages.map((message) => ({
        role: message.role,
        content: message.content,
      }));

      const stream = await streamChatCompletion(
        {
          messages: [MATRIX_RPG_SYSTEM_CONTEXT, buildExplorationContext(discoveredRef.current), ...messages],
        },
        {
          consumer: CHAT_CONSUMERS.MATRIX_RPG,
          signal: controller.signal,
        },
      );

      if (controller.signal.aborted || activeStreamRef.current?.id !== streamId) return;

      const reader = stream.getReader();
      activeStreamRef.current.reader = reader;
      const decoder = new TextDecoder();
      let assistantResponse = '';
      setTerminalStatus('streaming');

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (controller.signal.aborted || activeStreamRef.current?.id !== streamId) {
          await reader.cancel().catch(() => undefined);
          return;
        }

        assistantResponse += decoder.decode(value, { stream: true });
        setTerminalOutput((prev) => replaceStreamBlock(prev, marker, assistantResponse));
      }

      assistantResponse += decoder.decode();

      if (controller.signal.aborted || activeStreamRef.current?.id !== streamId) return;

      const assistantMessage: Message = { role: 'assistant', content: assistantResponse };
      setConversations((prev) => [...prev, assistantMessage].slice(-MAX_CONVERSATION_MESSAGES));
      setTerminalOutput((prev) => capScrollback(`${stripStreamMarkers(replaceStreamBlock(prev, marker, assistantResponse))}\n\n${buildPrompt(cwdRef.current)}`));
      setTerminalStatus('idle');
      announce(`Unknown Entity: ${assistantResponse}`);
      sound.playBell();
    } catch (error) {
      if (controller.signal.aborted || isAbortError(error) || activeStreamRef.current?.id !== streamId) return;

      console.error('Error processing Matrix RPG chat:', error);
      setTerminalStatus('error');
      setTerminalOutput((prev) => `${stripStreamMarkers(prev)}\n[ERROR] Neural interface connection lost\n[SYSTEM] Prompt restored; try again.\n\n${buildPrompt(cwdRef.current)}`);
      announce('Neural interface error. Prompt restored.');
      sound.playError();
    } finally {
      if (activeStreamRef.current?.id === streamId) {
        activeStreamRef.current = null;
      }
    }
  }, [announce, conversations, dispatch, markUserInteracted, sound, userInput]);

  useEffect(() => {
    isMountedRef.current = true;
    bootTimerRef.current = setTimeout(() => {
      if (!isMountedRef.current) return;
      setGameState('loading');
      setTerminalOutput('Initializing Synaptic Neural Interface...\n\n');
    }, 500);

    return () => {
      isMountedRef.current = false;
      clearBootTimers();
      clearMysteriousMessages();
      activeStreamRef.current?.controller.abort();
      activeStreamRef.current?.reader?.cancel().catch(() => undefined);
      activeStreamRef.current = null;
    };
  }, [clearBootTimers, clearMysteriousMessages]);

  useEffect(() => {
    if (crt.effectiveIntensity === 0 || crt.overrideReason === 'reduced-motion') {
      setIsPoweringOn(false);
      return;
    }

    setIsPoweringOn(true);
    powerTimerRef.current = setTimeout(() => setIsPoweringOn(false), 900);

    return () => {
      if (powerTimerRef.current) {
        clearTimeout(powerTimerRef.current);
        powerTimerRef.current = null;
      }
    };
    // Power-on is intentionally a mount animation, not replayed on intensity changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Phase 1: stream the boot log line by line, then hand off to 'ready'.
  useEffect(() => {
    if (gameState !== 'loading') return;

    let cancelled = false;
    const bootLines = buildBootLines(makeFormat(colsRef.current));
    let line = 0;

    const tick = () => {
      if (cancelled || !isMountedRef.current) return;

      if (line >= bootLines.length) {
        readyTimerRef.current = setTimeout(() => {
          if (cancelled || !isMountedRef.current) return;
          setTerminalOutput((prev) => prev + buildWelcome(makeFormat(colsRef.current)) + '\n');
          setGameState('ready');
        }, 800);
        return;
      }

      // Capture the line's content now; reading bootLines[line] inside the
      // updater would re-read the mutated `line` at render time (and StrictMode
      // double-invokes updaters), which drops/duplicates lines.
      const current = bootLines[line];
      line++;
      setTerminalOutput((prev) => prev + current + '\n');
      bootLineTimerRef.current = setTimeout(tick, 80 + Math.random() * 120);
    };

    bootLineTimerRef.current = setTimeout(tick, 80 + Math.random() * 120);

    return () => {
      cancelled = true;
      if (bootLineTimerRef.current) clearTimeout(bootLineTimerRef.current);
      if (readyTimerRef.current) clearTimeout(readyTimerRef.current);
    };
  }, [gameState]);

  // Phase 2: after the welcome settles, go interactive and show the prompt.
  useEffect(() => {
    if (gameState !== 'ready') return;

    let cancelled = false;
    interactiveTimerRef.current = setTimeout(() => {
      if (cancelled || !isMountedRef.current) return;
      setGameState('interactive');
      setTerminalOutput((prev) => appendPrompt(prev, buildPrompt(cwdRef.current)));
    }, 2000);

    return () => {
      cancelled = true;
      if (interactiveTimerRef.current) clearTimeout(interactiveTimerRef.current);
    };
  }, [gameState]);

  useEffect(() => {
    if (gameState === 'interactive') startMysteriousMessages();
  }, [gameState, startMysteriousMessages]);

  useEffect(() => {
    const cursorInterval = setInterval(() => setShowCursor((prev) => !prev), 500);
    return () => clearInterval(cursorInterval);
  }, []);

  const renderedContent = useMemo(() => {
    let content = stripStreamMarkers(terminalOutput);
    if (gameState !== 'interactive') content += showCursor ? CURSOR_CHAR : ' ';
    return content;
  }, [gameState, showCursor, terminalOutput]);

  return (
    <div className={`matrix-rpg-game ${isPoweringOn ? 'matrix-rpg-game--power-on' : ''}`}>
      <MatrixRPGHeader
        gameState={gameState}
        crtIntensity={crt.effectiveIntensity}
        isCrtOverridden={crt.isOverriddenByOs}
        fragmentsRecovered={discovered.fragments.size}
        totalFragments={TOTAL_FRAGMENTS}
        mirrorRestored={isRestored(discovered)}
      />

      <div className={`matrix-rpg-container ${className}`}>
        <MatrixRPGTerminal
          content={renderedContent}
          promptPrefix={promptPrefix}
          gameState={gameState}
          terminalStatus={terminalStatus}
          userInput={userInput}
          isProcessing={isProcessing}
          commands={VISIBLE_COMMANDS}
          announcements={announcements}
          preferredIntensity={crt.preferredIntensity}
          effectiveIntensity={crt.effectiveIntensity}
          isCrtOverridden={crt.isOverriddenByOs}
          crtOverrideReason={crt.overrideReason}
          soundEnabled={sound.enabled}
          onToggleSound={sound.toggle}
          onKeyPress={sound.playKey}
          onMetrics={handleMetrics}
          onInputChange={setUserInput}
          onSubmit={handleSubmit}
          onAbort={handleAbort}
          onCycleIntensity={crt.cycleIntensity}
        />
      </div>

      <MatrixRPGFooter />
    </div>
  );
}

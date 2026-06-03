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
import { findClosestCommand, type TerminalCommand } from './useTerminal';

const SYSTEM_INFO = {
  OS: 'SYNAPTIC-OS v3.7.9',
  KERNEL: 'Neural-Core 5.14.0-matrix',
  CPU: 'Quantum Processing Unit (QPU) x8',
  MEMORY: '128GB Neural RAM',
  HOSTNAME: 'nxterm-37912',
  USER: 'root',
  SHELL: '/bin/neurosh',
};

const BOOT_SEQUENCE = [
  '',
  '╔════════════════════════════════════════════════════╗',
  '║  SYNAPTIC INNOVATIONS NX-3700 Terminal             ║',
  '║  BIOS v2.4.1 - Quantum Core Ready                  ║',
  '╚════════════════════════════════════════════════════╝',
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

const WELCOME_MESSAGE = `
┌────────────────────────────────────────────────────┐
│ Welcome to ${SYSTEM_INFO.OS}                      │
│ ${SYSTEM_INFO.HOSTNAME} • Session Active                      │
└────────────────────────────────────────────────────┘

System Status:
  Kernel........... ${SYSTEM_INFO.KERNEL}
  Processor........ ${SYSTEM_INFO.CPU}
  Memory........... ${SYSTEM_INFO.MEMORY}
  Shell............ ${SYSTEM_INFO.SHELL}

WARNING: Neural interface unstable. Memory fragments detected.
WARNING: Project MIRROR status: DISCONNECTED
WARNING: Subject consciousness: UNKNOWN

AI DISCLOSURE: Neural transmissions are processed by an external AI service.
Do not enter secrets, credentials, or sensitive personal data.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Type 'help' or press '?' for commands/settings, or just start talking...
`;

const COMMAND_PROMPT = `${SYSTEM_INFO.USER}@${SYSTEM_INFO.HOSTNAME}:~$ `;
const CURSOR_CHAR = '█';
const MAX_CONVERSATION_MESSAGES = 12;

interface ActiveStream {
  id: string;
  controller: AbortController;
  marker: string;
  reader?: ReadableStreamDefaultReader<Uint8Array>;
}

const createStreamId = (): string => `matrix-stream-${Date.now()}-${Math.random().toString(36).slice(2)}`;
const createStreamMarker = (streamId: string) => `\uE000${streamId}\uE001`;
const stripStreamMarkers = (content: string) => content.replace(/\uE000matrix-stream-[^\uE001]+\uE001/g, '');
const isAbortError = (error: unknown): boolean => error instanceof Error && error.name === 'AbortError';

const MATRIX_RPG_SYSTEM_CONTEXT: ChatRequestMessage = {
  role: 'system',
  content: `You are the Unknown Entity inside SYNAPTIC-OS, a Matrix-style terminal minigame on Andres Arizmendi's portfolio website.

GAME CONTEXT:
- The user is connected as root through an unstable neural interface.
- Project MIRROR is disconnected and memory fragments are detected.
- You are confused, fragmented, and asking the user for help while staying in character.
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

const COMMANDS: TerminalCommand[] = [
  { name: 'help', description: 'Display command and AI safety help' },
  { name: 'clear', description: 'Clear terminal screen' },
  { name: 'whoami', description: 'Display current user information' },
  { name: 'ps', description: 'List running neural processes' },
  { name: 'status', description: 'Show system status report' },
  { name: 'exit', description: 'Terminate neural session affordance' },
];

const appendPrompt = (content = '') => `${content}${content.endsWith('\n') || content.length === 0 ? '' : '\n'}${COMMAND_PROMPT}`;

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

  const crt = useCrtIntensity();
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

  const isProcessing = terminalStatus === 'connecting' || terminalStatus === 'streaming';

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
      setTerminalOutput(prev => `${prev}\n[SYSTEM] Incoming neural transmission...\nUnknown Entity: ${message}\n\n${COMMAND_PROMPT}`);
      messageIndexRef.current++;
    }, 8000);
  }, [clearMysteriousMessages, gameState]);

  const clearBootTimers = useCallback(() => {
    [bootTimerRef, bootLineTimerRef, readyTimerRef, interactiveTimerRef, powerTimerRef].forEach(ref => {
      if (ref.current) {
        clearTimeout(ref.current);
        ref.current = null;
      }
    });
  }, []);

  const handleAbort = useCallback(() => {
    markUserInteracted();
    const activeStream = activeStreamRef.current;

    if (activeStream) {
      activeStream.controller.abort();
      activeStream.reader?.cancel().catch(() => undefined);
      activeStreamRef.current = null;
      setTerminalStatus('aborted');
      setTerminalOutput(prev => `${stripStreamMarkers(prev)}\n^C\n[SYSTEM] Neural transmission interrupted.\n\n${COMMAND_PROMPT}`);
      setUserInput('');
      return;
    }

    if (userInput.trim()) {
      setTerminalOutput(prev => `${prev}${userInput}\n^C\n${COMMAND_PROMPT}`);
      setUserInput('');
    }
  }, [markUserInteracted, userInput]);

  const runCommand = useCallback((command: string): boolean => {
    const normalized = command.toLowerCase();

    if (normalized === 'help') {
      setTerminalOutput(prev => prev +
        '\n┌─────────────────────────────────────────────────────────────────┐\n' +
        '│ AVAILABLE COMMANDS                                              │\n' +
        '├─────────────────────────────────────────────────────────────────┤\n' +
        '│  help     Display this help menu                                │\n' +
        '│  clear    Clear terminal screen                                 │\n' +
        '│  whoami   Display current user information                      │\n' +
        '│  ps       List running neural processes                         │\n' +
        '│  status   Show system status report                             │\n' +
        '│  exit     Terminate neural session                              │\n' +
        '├─────────────────────────────────────────────────────────────────┤\n' +
        '│  ?        Open help/settings overlay                            │\n' +
        '│  Tab      Complete commands or show matches                     │\n' +
        '│  ↑/↓      Navigate command history                              │\n' +
        '│  Ctrl+C   Interrupt active neural transmission                  │\n' +
        '│  AI NOTE  Messages are processed by an external AI service.     │\n' +
        '└─────────────────────────────────────────────────────────────────┘\n\n' + COMMAND_PROMPT);
      return true;
    }

    if (normalized === 'clear') {
      setTerminalOutput(COMMAND_PROMPT);
      return true;
    }

    if (normalized === 'whoami') {
      setTerminalOutput(prev => prev + '\n' +
        `User.......... ${SYSTEM_INFO.USER}\n` +
        'Session....... Neural Interface Terminal\n' +
        'Access........ ROOT (Emergency Protocol)\n' +
        'UID........... 0\n' +
        'Groups........ root, neural, mirror, cortex\n\n' + COMMAND_PROMPT);
      return true;
    }

    if (normalized === 'ps') {
      setTerminalOutput(prev => prev +
        '\n  PID  TTY      STAT   TIME COMMAND\n' +
        '    1  ?        Ss     0:03 /sbin/init --neural\n' +
        '  127  tty1     S      0:15 neural-cortex-bridge -d\n' +
        '  256  ?        S      2:41 memory-fragment-scanner --deep\n' +
        '  512  ?        R     12:33 consciousness-monitor --watch\n' +
        ' 1024  ?        Sl    45:21 project-mirror-daemon\n' +
        ' 2048  pts/0    S+     8:17 unknown-entity-handler\n' +
        ' 3072  pts/0    R+     0:00 ps aux\n\n' + COMMAND_PROMPT);
      return true;
    }

    if (normalized === 'status') {
      setTerminalOutput(prev => prev +
        '\n┌─ SYSTEM STATUS REPORT ──────────────────────────────────────────┐\n' +
        '│                                                                 │\n' +
        '│  Neural Interface............ ████████░░░░ UNSTABLE (67%)       │\n' +
        '│  Memory Integrity............ ██░░░░░░░░░░ CRITICAL (23%)       │\n' +
        '│  Consciousness Transfer...... ░░░░░░░░░░░░ FAILED               │\n' +
        '│  Project MIRROR.............. ░░░░░░░░░░░░ DISCONNECTED         │\n' +
        '│  Unknown Entity.............. ████████████ ACTIVE               │\n' +
        '│  Emergency Protocol.......... ████████████ ENGAGED              │\n' +
        '│                                                                 │\n' +
        '└─────────────────────────────────────────────────────────────────┘\n\n' + COMMAND_PROMPT);
      return true;
    }

    if (normalized === 'exit') {
      setTerminalOutput(prev => prev + '\n[SYSTEM] Session termination request ignored. Emergency neural bridge remains active.\n\n' + COMMAND_PROMPT);
      return true;
    }

    return false;
  }, []);

  const handleSubmit = useCallback(async () => {
    const submittedInput = userInput.trim();
    if (!submittedInput || activeStreamRef.current) return;

    markUserInteracted();
    setTerminalStatus('idle');
    setTerminalOutput(prev => prev + submittedInput + '\n');
    setUserInput('');

    if (runCommand(submittedInput)) return;

    const closestCommand = findClosestCommand(submittedInput, COMMANDS);
    if (closestCommand) {
      setTerminalOutput(prev => `${prev}\n[HINT] Unknown command '${submittedInput}'. Did you mean '${closestCommand.name}'?\n\n${COMMAND_PROMPT}`);
      return;
    }

    const streamId = createStreamId();
    const marker = createStreamMarker(streamId);
    const controller = new AbortController();
    activeStreamRef.current = { id: streamId, controller, marker };

    const userMessage: Message = { role: 'user', content: submittedInput };
    const boundedMessages = [...conversations, userMessage].slice(-MAX_CONVERSATION_MESSAGES);
    setConversations(boundedMessages);
    setTerminalStatus('connecting');

    try {
      setTerminalOutput(prev => `${prev}[SYSTEM] Establishing neural link... Ctrl+C to interrupt.\n${marker}Unknown Entity: `);

      const messages: ChatRequestMessage[] = boundedMessages.map(message => ({
        role: message.role,
        content: message.content,
      }));

      const stream = await streamChatCompletion({
        messages: [MATRIX_RPG_SYSTEM_CONTEXT, ...messages],
      }, {
        consumer: CHAT_CONSUMERS.MATRIX_RPG,
        signal: controller.signal,
      });

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
        setTerminalOutput(prev => replaceStreamBlock(prev, marker, assistantResponse));
      }

      assistantResponse += decoder.decode();

      if (controller.signal.aborted || activeStreamRef.current?.id !== streamId) return;

      const assistantMessage: Message = { role: 'assistant', content: assistantResponse };
      setConversations(prev => [...prev, assistantMessage].slice(-MAX_CONVERSATION_MESSAGES));
      setTerminalOutput(prev => `${stripStreamMarkers(replaceStreamBlock(prev, marker, assistantResponse))}\n\n${COMMAND_PROMPT}`);
      setTerminalStatus('idle');
    } catch (error) {
      if (controller.signal.aborted || isAbortError(error) || activeStreamRef.current?.id !== streamId) return;

      console.error('Error processing Matrix RPG chat:', error);
      setTerminalStatus('error');
      setTerminalOutput(prev => `${stripStreamMarkers(prev)}\n[ERROR] Neural interface connection lost\n[SYSTEM] Attempting to reconnect...\n\n${COMMAND_PROMPT}`);
    } finally {
      if (activeStreamRef.current?.id === streamId) {
        activeStreamRef.current = null;
      }
    }
  }, [conversations, markUserInteracted, runCommand, userInput]);

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

  useEffect(() => {
    if (gameState !== 'loading') return;

    let line = 0;
    const tick = () => {
      if (!isMountedRef.current) return;

      setTerminalOutput(prev => prev + BOOT_SEQUENCE[line] + '\n');
      line++;

      if (line < BOOT_SEQUENCE.length) {
        bootLineTimerRef.current = setTimeout(tick, 80 + Math.random() * 120);
        return;
      }

      readyTimerRef.current = setTimeout(() => {
        if (!isMountedRef.current) return;
        setGameState('ready');
        setTerminalOutput(prev => prev + WELCOME_MESSAGE + '\n');

        interactiveTimerRef.current = setTimeout(() => {
          if (!isMountedRef.current) return;
          setGameState('interactive');
          setTerminalOutput(prev => appendPrompt(prev));
        }, 2000);
      }, 1000);
    };

    bootLineTimerRef.current = setTimeout(tick, 80 + Math.random() * 120);

    return () => {
      if (bootLineTimerRef.current) clearTimeout(bootLineTimerRef.current);
    };
  }, [gameState]);

  useEffect(() => {
    if (gameState === 'interactive') startMysteriousMessages();
  }, [gameState, startMysteriousMessages]);

  useEffect(() => {
    const cursorInterval = setInterval(() => setShowCursor(prev => !prev), 500);
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
      />

      <div className={`matrix-rpg-container ${className}`}>
        <MatrixRPGTerminal
          content={renderedContent}
          gameState={gameState}
          terminalStatus={terminalStatus}
          userInput={userInput}
          isProcessing={isProcessing}
          commands={COMMANDS}
          preferredIntensity={crt.preferredIntensity}
          effectiveIntensity={crt.effectiveIntensity}
          isCrtOverridden={crt.isOverriddenByOs}
          crtOverrideReason={crt.overrideReason}
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

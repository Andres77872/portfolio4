import { useEffect, useState, useRef } from 'react';
import './MatrixRPG.css';
import { streamChatCompletion } from '../../services/chatService';
import { GameState, Message, MatrixRPGProps } from './types';
import MatrixRPGHeader from './MatrixRPGHeader';
import MatrixRPGFooter from './MatrixRPGFooter';
import MatrixRPGTerminal from './MatrixRPGTerminal';

// System information for terminal authenticity
const SYSTEM_INFO = {
  OS: 'SYNAPTIC-OS v3.7.9',
  KERNEL: 'Neural-Core 5.14.0-matrix',
  CPU: 'Quantum Processing Unit (QPU) x8',
  MEMORY: '128GB Neural RAM',
  HOSTNAME: 'nxterm-37912',
  USER: 'root',
  SHELL: '/bin/neurosh'
};

// Terminal boot sequence - authentic POST/boot style
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
  ''
];

// Terminal welcome message
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

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Type 'help' for available commands or just start talking...
`;

// Terminal command prompt
const COMMAND_PROMPT = `${SYSTEM_INFO.USER}@${SYSTEM_INFO.HOSTNAME}:~$ `;

// Terminal special characters
const CURSOR_CHAR = '█';



export default function MatrixRPG({ className = '' }: MatrixRPGProps) {
  const [gameState, setGameState] = useState<GameState>('initializing');
  const [terminalOutput, setTerminalOutput] = useState('');
  const [showCursor, setShowCursor] = useState(true);
  const [userInput, setUserInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [conversations, setConversations] = useState<Message[]>([]);
  const [currentBootLine, setCurrentBootLine] = useState(0);

  // Global references for the messaging system
  const messageIntervalRef = useRef<number | null>(null);
  const messageIndexRef = useRef(0);
  const [hasUserInteracted, setHasUserInteracted] = useState(false);

  // Initial mysterious messages from the unknown entity
  const initialMessages = [
    "Hello?",
    "Is anyone there?",
    "Where am I?",
    "What is this place?",
    "I can't remember anything...",
    "Please... help me..."
  ];

  // Start mysterious messages
  const startMysteriousMessages = () => {
    messageIntervalRef.current = setInterval(() => {
      if (messageIndexRef.current < initialMessages.length && !hasUserInteracted) {
        const message = initialMessages[messageIndexRef.current];

        // Add system notification of incoming message
        setTerminalOutput(prev =>
          prev + '\n[SYSTEM] Incoming neural transmission...\n' +
          `Unknown Entity: ${message}\n\n` + COMMAND_PROMPT
        );

        messageIndexRef.current++;
      } else {
        if (messageIntervalRef.current) {
          clearInterval(messageIntervalRef.current);
          messageIntervalRef.current = null;
        }
      }
    }, 8000); // Send a message every 8 seconds
  };

  // Boot sequence effect
  useEffect(() => {
    if (gameState === 'loading' && currentBootLine < BOOT_SEQUENCE.length) {
      const timer = setTimeout(() => {
        setTerminalOutput(prev => prev + BOOT_SEQUENCE[currentBootLine] + '\n');
        setCurrentBootLine(prev => prev + 1);

        // When boot sequence is complete, show welcome message
        if (currentBootLine + 1 >= BOOT_SEQUENCE.length) {
          setTimeout(() => {
            setGameState('ready');
            setTerminalOutput(prev => prev + WELCOME_MESSAGE + '\n');

            // Transition to interactive mode
            setTimeout(() => {
              setGameState('interactive');
              setTerminalOutput(prev => prev + COMMAND_PROMPT);

              // Start mysterious messages from the unknown entity
              startMysteriousMessages();
            }, 2000);
          }, 1000);
        }
      }, 80 + Math.random() * 120); // Faster boot timing for authenticity

      return () => clearTimeout(timer);
    }
  }, [gameState, currentBootLine, startMysteriousMessages]);

  // Initialize terminal on mount with CRT power-on effect
  useEffect(() => {
    // Start boot sequence after brief CRT warmup
    const timer = setTimeout(() => {
      setGameState('loading');
      setTerminalOutput('Initializing Synaptic Neural Interface...\n\n');
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  // Blinking cursor effect
  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 500);

    return () => clearInterval(cursorInterval);
  }, []);

  // Handle user input change
  const handleInputChange = (input: string) => {
    setUserInput(input);
  };

  // Handle user input submission
  const handleSubmit = async () => {
    if (!userInput.trim() || isProcessing) return;

    // Stop automated messages on first user interaction
    if (!hasUserInteracted) {
      setHasUserInteracted(true);
      if (messageIntervalRef.current) {
        clearInterval(messageIntervalRef.current);
        messageIntervalRef.current = null;
      }
    }

    // Add user input to terminal output
    setTerminalOutput(prev => prev + userInput + '\n');

    // Handle terminal commands
    if (userInput.toLowerCase() === 'help') {
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
        '│  Or type anything to communicate with the unknown entity...     │\n' +
        '└─────────────────────────────────────────────────────────────────┘\n\n' +
        COMMAND_PROMPT
      );
      setUserInput('');
      return;
    }

    if (userInput.toLowerCase() === 'clear') {
      setTerminalOutput(COMMAND_PROMPT);
      setUserInput('');
      return;
    }

    if (userInput.toLowerCase() === 'whoami') {
      setTerminalOutput(prev => prev +
        '\n' +
        `User.......... ${SYSTEM_INFO.USER}\n` +
        `Session....... Neural Interface Terminal\n` +
        `Access........ ROOT (Emergency Protocol)\n` +
        `UID........... 0\n` +
        `Groups........ root, neural, mirror, cortex\n\n` +
        COMMAND_PROMPT
      );
      setUserInput('');
      return;
    }

    if (userInput.toLowerCase() === 'ps') {
      setTerminalOutput(prev => prev +
        '\n  PID  TTY      STAT   TIME COMMAND\n' +
        '    1  ?        Ss     0:03 /sbin/init --neural\n' +
        '  127  tty1     S      0:15 neural-cortex-bridge -d\n' +
        '  256  ?        S      2:41 memory-fragment-scanner --deep\n' +
        '  512  ?        R     12:33 consciousness-monitor --watch\n' +
        ' 1024  ?        Sl    45:21 project-mirror-daemon\n' +
        ' 2048  pts/0    S+     8:17 unknown-entity-handler\n' +
        ' 3072  pts/0    R+     0:00 ps aux\n\n' +
        COMMAND_PROMPT
      );
      setUserInput('');
      return;
    }

    if (userInput.toLowerCase() === 'status') {
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
        '└─────────────────────────────────────────────────────────────────┘\n\n' +
        COMMAND_PROMPT
      );
      setUserInput('');
      return;
    }

    // For all other inputs, treat as conversation with the unknown entity
    const userMessage: Message = {
      role: 'user',
      content: userInput
    };
    
    setConversations(prev => [...prev, userMessage]);
    setUserInput('');
    setIsProcessing(true);
    
    try {
      // Show AI is responding
      setTerminalOutput(prev => prev + '[SYSTEM] Establishing neural link...\n');
      setTerminalOutput(prev => prev + 'Unknown Entity: ');

      // Prepare conversation history for API
      const messages = conversations.concat(userMessage).map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      // Call chatService with the conversation
      const stream = await streamChatCompletion({ messages });
      const reader = stream.getReader();
      let assistantResponse = '';
      
      // Process the streaming response
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        // Convert the chunk to text
        const chunk = new TextDecoder().decode(value);
        assistantResponse += chunk;
        
        // Simple update - just replace the Unknown Entity line with current response
        setTerminalOutput(prev => {
          const lines = prev.split('\n');
          const lastLineIndex = lines.length - 1;
          
          // Update the last line if it starts with Unknown Entity
          if (lines[lastLineIndex].startsWith('Unknown Entity:')) {
            lines[lastLineIndex] = 'Unknown Entity: ' + assistantResponse;
          }
          
          return lines.join('\n');
        });
      }

      // Add assistant's response to conversation history
      const assistantMessage: Message = {
        role: 'assistant',
        content: assistantResponse
      };
      
      setConversations(prev => [...prev, assistantMessage]);

      // Add new command prompt
      setTerminalOutput(prev => prev + '\n\n' + COMMAND_PROMPT);

    } catch (error) {
      console.error('Error processing chat:', error);
      setTerminalOutput(prev => prev +
        '\n[ERROR] Neural interface connection lost\n' +
        '[SYSTEM] Attempting to reconnect...\n\n' +
        COMMAND_PROMPT
      );
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Render the terminal content based on game state
  const renderTerminalContent = () => {
    let content = terminalOutput;

    // Add cursor for non-interactive states
    if (gameState !== 'interactive') {
      content += showCursor ? CURSOR_CHAR : ' ';
    }

    return content;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (messageIntervalRef.current) {
        clearInterval(messageIntervalRef.current);
      }
    };
  }, []);

  return (
    <div className="matrix-rpg-game">
      <MatrixRPGHeader gameState={gameState} />

      <div className={`matrix-rpg-container ${className}`}>
        <MatrixRPGTerminal
          content={renderTerminalContent()}
          gameState={gameState}
          userInput={userInput}
          isProcessing={isProcessing}
          onInputChange={handleInputChange}
          onSubmit={handleSubmit}
        />
      </div>

      <MatrixRPGFooter />
    </div>
  );
}

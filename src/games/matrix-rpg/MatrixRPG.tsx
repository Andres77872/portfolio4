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
  HOSTNAME: 'matrix-terminal-node-37912',
  USER: 'root',
  SHELL: '/bin/neurosh'
};

// Terminal boot sequence
const BOOT_SEQUENCE = [
  '[ OK ] Starting Synaptic Innovations Neural Interface...',
  '[ OK ] Mounting quantum filesystem...',
  '[ OK ] Loading neural network drivers...',
  '[ OK ] Initializing consciousness simulation...',
  '[ OK ] Starting memory fragmentation service...',
  '[ OK ] Enabling neural cortex bridge...',
  '[ OK ] Loading Project MIRROR protocols...',
  '[ WARN ] Memory integrity check failed',
  '[ ERROR ] Consciousness transfer incomplete',
  '[ INFO ] Switching to emergency neural mode...',
  ''
];

// Terminal welcome message
const WELCOME_MESSAGE = `
Welcome to ${SYSTEM_INFO.OS}
${SYSTEM_INFO.HOSTNAME} - ${SYSTEM_INFO.USER}@${SYSTEM_INFO.HOSTNAME}
Last login: ${new Date().toLocaleDateString()} ${new Date().toLocaleTimeString()}

System Information:
- OS: ${SYSTEM_INFO.OS}
- Kernel: ${SYSTEM_INFO.KERNEL}
- CPU: ${SYSTEM_INFO.CPU}
- Memory: ${SYSTEM_INFO.MEMORY}
- Shell: ${SYSTEM_INFO.SHELL}

WARNING: Neural interface unstable. Memory fragments detected.
Project MIRROR status: DISCONNECTED
Subject consciousness: UNKNOWN

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
      }, 150 + Math.random() * 200); // Realistic boot timing

      return () => clearTimeout(timer);
    }
  }, [gameState, currentBootLine, startMysteriousMessages]);

  // Initialize terminal on mount
  useEffect(() => {
    // Start boot sequence
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
        'Available commands:\n' +
        '  help     - Show this help message\n' +
        '  clear    - Clear terminal screen\n' +
        '  whoami   - Display current user\n' +
        '  ps       - Show running processes\n' +
        '  status   - Show system status\n' +
        '  exit     - Exit terminal\n\n' +
        'Or just type anything to talk with the unknown entity...\n\n' +
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
        `${SYSTEM_INFO.USER}\n` +
        `Current session: Neural Interface Terminal\n` +
        `Access level: ROOT (Emergency Protocol)\n\n` +
        COMMAND_PROMPT
      );
      setUserInput('');
      return;
    }

    if (userInput.toLowerCase() === 'ps') {
      setTerminalOutput(prev => prev +
        'PID  COMMAND\n' +
        '1    /init\n' +
        '127  neural-cortex-bridge\n' +
        '256  memory-fragment-scanner\n' +
        '512  consciousness-monitor\n' +
        '1024 project-mirror-daemon\n' +
        '2048 unknown-entity-handler\n\n' +
        COMMAND_PROMPT
      );
      setUserInput('');
      return;
    }

    if (userInput.toLowerCase() === 'status') {
      setTerminalOutput(prev => prev +
        'System Status:\n' +
        '- Neural Interface: UNSTABLE\n' +
        '- Memory Integrity: 23%\n' +
        '- Consciousness Transfer: FAILED\n' +
        '- Project MIRROR: DISCONNECTED\n' +
        '- Unknown Entity: ACTIVE\n' +
        '- Emergency Protocol: ENGAGED\n\n' +
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
        
        // Update the terminal with each chunk
        setTerminalOutput(prev => {
          const lines = prev.split('\n');
          const lastLineIndex = lines.length - 1;
          if (lines[lastLineIndex].startsWith('Unknown Entity: ')) {
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

import { useEffect, useRef, useState, KeyboardEvent, ChangeEvent, FormEvent } from 'react';
import './MatrixRPG.css';
import { streamChatCompletion } from '../../services/chatService';

// Type definitions
interface MatrixRPGProps {
  className?: string;
  width?: number;
  height?: number;
}

// Message type definitions
interface Message {
  role: 'user' | 'assistant';
  content: string;
}

// ASCII Art
const ASCII_ART = {
  COMPANY_LOGO: `
   _____                       _   _      
  / ____|                     | | (_)     
 | (___  _   _ _ __   __ _ ___| |_ _  ___ 
  \\___ \\| | | | '_ \\ / _\` / __| __| |/ __|
  ____) | |_| | | | | (_| \\__ \\ |_| | (__ 
 |_____/ \\__, |_| |_|\\__,_|___/\\__|_|\\___|
          __/ |                           
         |___/   INNOVATIONS              
`,
  TERMINAL_START: `
 ┌─────────────────────────────────────┐
 │  PROJECT MIRROR - Neural Interface  │
 │  SYS.37912       STATUS: CONNECTING │
 │  Terminal v3.7.9.12                 │
 │  [SYSTEM BOOT]                      │
 └─────────────────────────────────────┘
`,
  CHECKPOINT: `
 [CHECKPOINT DATA]
 > User ID: DR-MC-227
 > Subject: MARCUS
 > Project: MIRROR
 > Status: DISCONNECTED
`
};

// Loading messages
const LOADING_MESSAGES = [
  "Initializing neural interface...",
  "Scanning memory fragments...",
  "Establishing connection to central cortex...",
  "Loading consciousness data...",
  "Searching for identity markers...",
  "Retrieving project MIRROR data...",
  "Analyzing synaptic patterns...",
  "Connection unstable. Retrying...",
  "Attempting emergency protocol...",
  "Memory corruption detected...",
  "Initiating consciousness simulation..."
];

// Terminal special characters
const CURSOR_CHAR = '█';

// Game states
type GameState = 'initializing' | 'loading' | 'checkpoint' | 'ready' | 'typing' | 'interactive';

export default function MatrixRPG({ className = '', width, height }: MatrixRPGProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const terminalRef = useRef<HTMLPreElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [gameState, setGameState] = useState<GameState>('initializing');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [currentText, setCurrentText] = useState(ASCII_ART.COMPANY_LOGO); // Load logo directly
  const [showCursor, setShowCursor] = useState(true);
  const [userInput, setUserInput] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [conversations, setConversations] = useState<Message[]>([]);
  
  // Apply the className to the container div

  // Initialize terminal on mount
  useEffect(() => {
    // Start game sequence after a short delay
    const timer = setTimeout(() => {
      startGameSequence();
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [width, height]);
  
  // Scroll terminal content to bottom whenever it changes
  useEffect(() => {
    if (terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [currentText, gameState]);

  // Blinking cursor effect
  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setShowCursor(prev => !prev);
    }, 500);

    return () => clearInterval(cursorInterval);
  }, []);

  // Game sequence states
  const startGameSequence = () => {
    // Start with terminal header
    setGameState('loading');
    
    // Show loading messages
    showNextMessage(0);
    
    // Set loading progress incrementally
    const progressInterval = setInterval(() => {
      setLoadingProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          // Show checkpoint when loading complete
          setTimeout(() => {
            setGameState('checkpoint');
            setCurrentText(prev => prev + '\n\n' + ASCII_ART.CHECKPOINT);
            // After checkpoint, show ready state
            setTimeout(() => {
              setGameState('ready');
              
              // After a delay, transition to interactive mode
              setTimeout(() => {
                setCurrentText(prev => 
                  prev + '\n\n> CONNECTION ESTABLISHED: Direct neural interface active\n> You can now communicate with the trapped consciousness...\n'
                );
                setGameState('interactive');
              }, 2000);
            }, 1500);
          }, 1000);
          return 100;
        }
        return prev + (Math.random() * 4 + 1);
      });
    }, 200);
    
    // Function to show loading messages
    function showNextMessage(index: number = 0) {
      if (index >= LOADING_MESSAGES.length) return;
      
      setCurrentText(prev => prev + '\n> ' + LOADING_MESSAGES[index]);
      setTimeout(() => showNextMessage(index + 1), 1200);
    }
  };
  
  // Handle user input change
  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    setUserInput(e.target.value);
  };
  
  // Handle user input submission
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    if (!userInput.trim() || isProcessing) return;
    
    // Add user message to conversation
    const userMessage: Message = {
      role: 'user',
      content: userInput
    };
    
    setConversations(prev => [...prev, userMessage]);
    
    // Update terminal with user message
    setCurrentText(prev => `${prev}\n\nYou: ${userInput}`);
    
    // Clear input field and set processing state
    setUserInput('');
    setIsProcessing(true);
    
    try {
      // Update terminal to show AI is thinking
      setCurrentText(prev => `${prev}\n\nDr. Marcus: `);
      
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
        setCurrentText(prev => {
          const parts = prev.split('Dr. Marcus: ');
          return parts[0] + 'Dr. Marcus: ' + assistantResponse;
        });
      }
      
      // Add assistant's response to conversation history
      const assistantMessage: Message = {
        role: 'assistant',
        content: assistantResponse
      };
      
      setConversations(prev => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error processing chat:', error);
      setCurrentText(prev => `${prev}\nERROR: Connection to neural interface lost. Please try again.`);
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Handle keyboard input
  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      handleSubmit(e as unknown as FormEvent);
    }
  };

  // Render the terminal content based on game state
  const renderTerminalContent = () => {
    let content = currentText;
    
    if (gameState === 'ready') {
      content = `${ASCII_ART.TERMINAL_START}

${currentText}

> Consciousness transfer failed
> Memory fragmentation: 92.7%
> System reboot required

> ALERT: Subject appears to be conscious
> Attempting emergency extraction...
> Connection lost.

${showCursor ? '> _' : '> '}`;
    } else if (gameState === 'interactive') {
      content = `${ASCII_ART.TERMINAL_START}

${currentText}`;
      
      // Don't show cursor in interactive mode as input has its own cursor
    } else {
      content = `${ASCII_ART.TERMINAL_START}

${currentText}${showCursor ? CURSOR_CHAR : ' '}`;
    }
    
    return content;
  };

  return (
    <div className="matrix-rpg-game">
      {/* Game Header */}
      <div className="matrix-rpg-header">
        <div className="matrix-rpg-hud">
          <div className="matrix-rpg-title">
            PROJECT MIRROR - Neural Interface Terminal
          </div>
          {gameState === 'loading' && (
            <div className="matrix-rpg-progress-container">
              <div 
                className="matrix-rpg-progress-bar"
                style={{width: `${loadingProgress}%`}}
              ></div>
              <div className="matrix-rpg-progress-text">
                LOADING: {Math.floor(loadingProgress)}%
              </div>
            </div>
          )}
          <div className="matrix-rpg-sys-info">
            <span>SYS.37912</span>
            <span className="matrix-rpg-status">
              STATUS: {gameState === 'ready' ? 'CRITICAL' : 'CONNECTING'}
            </span>
          </div>
        </div>
      </div>
      
      {/* Terminal Container */}
      <div className={`matrix-rpg-container ${className}`} ref={containerRef}>
        {/* Old Terminal Screen */}
        <div className="matrix-rpg-terminal">
          <pre className="matrix-rpg-terminal-content" ref={terminalRef}>
            {renderTerminalContent()}
          </pre>
          
          {/* Chat Input - Only show when in interactive state */}
          {gameState === 'interactive' && (
            <form className="matrix-rpg-input-form" onSubmit={handleSubmit}>
              <div className="matrix-rpg-input-container">
                <span className="matrix-rpg-input-prompt">&gt;</span>
                <input
                  ref={inputRef}
                  type="text"
                  className="matrix-rpg-input"
                  value={userInput}
                  onChange={handleInputChange}
                  onKeyPress={handleKeyPress}
                  placeholder="Type your message here..."
                  disabled={isProcessing}
                  autoFocus
                />
              </div>
              <button 
                type="submit" 
                className="matrix-rpg-submit-btn"
                disabled={isProcessing || !userInput.trim()}
              >
                {isProcessing ? 'Sending...' : 'Send'}
              </button>
            </form>
          )}
        </div>
      </div>
      
      {/* Game Footer */}
      <div className="matrix-rpg-footer">
        <div className="matrix-rpg-game-instructions">
          {gameState === 'interactive' ? (
            <p>💻 Talk to Dr. Marcus Chen, a consciousness trapped in the neural interface...</p>
          ) : (
            <p>💻 A terminal to a lost consciousness. Dr. Marcus Chen is trapped in the Matrix RPG...</p>
          )}
        </div>
      </div>
    </div>
  );
}

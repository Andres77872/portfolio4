import { useEffect, useRef, useState } from 'react';
import './MatrixRPG.css';

// Type definitions
interface MatrixRPGProps {
  className?: string;
  width?: number;
  height?: number;
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
type GameState = 'initializing' | 'loading' | 'checkpoint' | 'ready' | 'typing';

export default function MatrixRPG({ className = '', width, height }: MatrixRPGProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [gameState, setGameState] = useState<GameState>('initializing');
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [currentText, setCurrentText] = useState(ASCII_ART.COMPANY_LOGO); // Load logo directly
  const [showCursor, setShowCursor] = useState(true);
  
  // Apply the className to the container div

  // Initialize terminal on mount
  useEffect(() => {
    // Start game sequence after a short delay
    const timer = setTimeout(() => {
      startGameSequence();
    }, 1000);
    
    return () => clearTimeout(timer);
  }, [width, height]);

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
            setTimeout(() => setGameState('ready'), 1500);
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
          <pre className="matrix-rpg-terminal-content">
            {renderTerminalContent()}
          </pre>
        </div>
      </div>
      
      {/* Game Footer */}
      <div className="matrix-rpg-footer">
        <div className="matrix-rpg-game-instructions">
          <p>💻 A terminal to a lost consciousness. Dr. Marcus Chen is trapped in the Matrix RPG...</p>
        </div>
      </div>
    </div>
  );
}

import { useEffect, useRef, useCallback, useState } from 'react';

interface Props {
  content: string;
  width: number;
  height: number;
  gameState: 'initializing' | 'loading' | 'checkpoint' | 'ready' | 'typing' | 'interactive';
  userInput: string;
  isProcessing: boolean;
  onInputChange: (input: string) => void;
  onSubmit: () => void;
}

// CRT Color palette for authentic phosphor look
const CRT_COLORS = {
  green: '#33ff33',
  greenBright: '#66ff66',
  greenDim: '#00cc00',
  greenGlow: 'rgba(51, 255, 51, 0.6)',
  amber: '#ffb000',
  amberGlow: 'rgba(255, 176, 0, 0.6)',
  red: '#ff4444',
  redGlow: 'rgba(255, 68, 68, 0.6)',
  blue: '#44aaff',
  blueGlow: 'rgba(68, 170, 255, 0.6)',
  magenta: '#ff66ff',
  magentaGlow: 'rgba(255, 102, 255, 0.6)',
  background: '#0a0f0a',
};

export default function MatrixRPGCanvas({
  content,
  width,
  height,
  gameState,
  userInput,
  isProcessing,
  onInputChange,
  onSubmit
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const effectCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const animationIdRef = useRef<number>();
  const hiddenInputRef = useRef<HTMLInputElement>(null);
  
  const [scrollY, setScrollY] = useState(0);
  const [maxScrollY, setMaxScrollY] = useState(0);
  const [isFocused, setIsFocused] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(true);

  // Terminal rendering constants - FIXED VALUES for consistency
  const LINE_HEIGHT = 18;
  const PADDING = 16;
  const FONT_SIZE = 15;
  // Calculate MAX_CHARS dynamically based on available width
  // Approximate char width for Courier New at 15px is ~9.6px
  const CHAR_WIDTH = 9.6;
  const MAX_CHARS = Math.max(40, Math.floor((width - PADDING * 2) / CHAR_WIDTH));
  const FONT_FAMILY = `${FONT_SIZE}px "Courier New", "Liberation Mono", monospace`;
  
  // Check if line contains box drawing characters (should not be wrapped)
  const isBoxLine = useCallback((line: string): boolean => {
    return /[─│┌┐└┘├┤┬┴┼╔╗╚╝╠╣╦╩╬═║━┃]/.test(line);
  }, []);
  
  // Wrap text to fit within screen (but never wrap box drawing lines)
  const wrapLine = useCallback((line: string, maxChars: number): string[] => {
    // Never wrap lines with box drawing characters
    if (isBoxLine(line)) return [line];
    
    if (line.length <= maxChars) return [line];
    
    const wrapped: string[] = [];
    let remaining = line;
    
    while (remaining.length > 0) {
      if (remaining.length <= maxChars) {
        wrapped.push(remaining);
        break;
      }
      
      // Try to break at space
      let breakPoint = remaining.lastIndexOf(' ', maxChars);
      if (breakPoint <= 0) {
        breakPoint = maxChars; // Force break if no space found
      }
      
      wrapped.push(remaining.substring(0, breakPoint));
      remaining = remaining.substring(breakPoint).trimStart();
    }
    
    return wrapped;
  }, [isBoxLine]);

  // Cursor blinking effect with CRT-like persistence
  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setCursorVisible(prev => !prev);
    }, 530); // Slightly irregular for authenticity

    return () => clearInterval(cursorInterval);
  }, []);

  // Auto-focus on mount and when entering interactive mode
  useEffect(() => {
    if (gameState === 'interactive' && hiddenInputRef.current) {
      setTimeout(() => {
        hiddenInputRef.current?.focus();
      }, 100);
    }
  }, [gameState]);

  const calculateTextHeight = useCallback((lines: string[]) => {
    let totalLines = 0;
    lines.forEach((line, index) => {
      const isLastLine = index === lines.length - 1;
      const isPromptLine = line.includes('@') && line.endsWith('$ ');
      
      // Box drawing lines don't wrap
      if (isBoxLine(line)) {
        totalLines += 1;
      } else if (isLastLine && isPromptLine && gameState === 'interactive') {
        // Account for user input on prompt line
        const fullLine = line + userInput;
        const wrappedCount = fullLine.length > 0 ? Math.ceil(fullLine.length / MAX_CHARS) : 1;
        totalLines += Math.max(1, wrappedCount);
      } else {
        // Empty lines still count as 1 line
        const wrappedCount = line.length > 0 ? Math.ceil(line.length / MAX_CHARS) : 1;
        totalLines += Math.max(1, wrappedCount);
      }
    });
    return totalLines * LINE_HEIGHT + PADDING * 2;
  }, [gameState, userInput, isBoxLine, MAX_CHARS]);

  const getLineColor = useCallback((line: string): { color: string; glow: string; intensity: number } => {
    if (line.startsWith('[ OK ]')) {
      return { color: CRT_COLORS.greenBright, glow: CRT_COLORS.greenGlow, intensity: 1.5 };
    }
    if (line.startsWith('[ ERROR ]')) {
      return { color: CRT_COLORS.red, glow: CRT_COLORS.redGlow, intensity: 2 };
    }
    if (line.startsWith('[ WARN ]')) {
      return { color: CRT_COLORS.amber, glow: CRT_COLORS.amberGlow, intensity: 1.3 };
    }
    if (line.startsWith('[ INFO ]')) {
      return { color: CRT_COLORS.blue, glow: CRT_COLORS.blueGlow, intensity: 1.2 };
    }
    if (line.startsWith('[SYSTEM]')) {
      return { color: CRT_COLORS.amber, glow: CRT_COLORS.amberGlow, intensity: 1.4 };
    }
    if (line.startsWith('Unknown Entity:') || line.startsWith(' '.repeat(15))) {
      return { color: CRT_COLORS.magenta, glow: CRT_COLORS.magentaGlow, intensity: 1.6 };
    }
    if (line.includes('@') && line.includes('$')) {
      return { color: CRT_COLORS.greenBright, glow: CRT_COLORS.greenGlow, intensity: 1.3 };
    }
    if (line.startsWith('WARNING:') || line.startsWith('Project MIRROR')) {
      return { color: CRT_COLORS.amber, glow: CRT_COLORS.amberGlow, intensity: 1.2 };
    }
    return { color: CRT_COLORS.green, glow: CRT_COLORS.greenGlow, intensity: 1 };
  }, []);

  const drawTerminalText = useCallback((ctx: CanvasRenderingContext2D, lines: string[], scrollOffset: number) => {
    ctx.font = FONT_FAMILY;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    
    // Get actual character width from canvas context for cursor positioning
    const charWidth = ctx.measureText('M').width;

    let currentY = PADDING - scrollOffset;

    lines.forEach((line, lineIndex) => {
      const isLastLine = lineIndex === lines.length - 1;
      const isPromptLine = line.includes('@') && line.endsWith('$ ');
      
      // Check if this is the active prompt line (last line ending with $ )
      if (isLastLine && isPromptLine && gameState === 'interactive') {
        // This is the prompt line - append user input to it
        const fullLine = line + userInput;
        const cursor = cursorVisible ? '█' : ' ';
        
        // Wrap the full line if needed (using fixed MAX_CHARS)
        const wrappedLines = wrapLine(fullLine, MAX_CHARS);
        
        wrappedLines.forEach((wrappedLine, wrapIndex) => {
          if (currentY >= -LINE_HEIGHT * 2 && currentY <= height + LINE_HEIGHT) {
            const { color, glow, intensity } = getLineColor(line);
            
            // Draw the text
            ctx.shadowColor = glow;
            ctx.shadowBlur = 8 * intensity;
            ctx.fillStyle = color;
            ctx.fillText(wrappedLine, PADDING, currentY);
            
            // Draw secondary glow layer
            ctx.shadowBlur = 4 * intensity;
            ctx.globalAlpha = 0.7;
            ctx.fillText(wrappedLine, PADDING, currentY);
            
            // Draw sharp text on top
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;
            ctx.fillText(wrappedLine, PADDING, currentY);
          }
          
          // Draw cursor on the last wrapped line
          if (wrapIndex === wrappedLines.length - 1 && isFocused) {
            const cursorX = PADDING + wrappedLine.length * charWidth;
            if (currentY >= -LINE_HEIGHT && currentY <= height + LINE_HEIGHT) {
              ctx.shadowColor = CRT_COLORS.greenGlow;
              ctx.shadowBlur = 15;
              ctx.fillStyle = CRT_COLORS.greenBright;
              ctx.fillText(cursor, cursorX, currentY);
              
              // Extra glow for cursor
              ctx.shadowBlur = 20;
              ctx.globalAlpha = 0.5;
              ctx.fillText(cursor, cursorX, currentY);
              ctx.globalAlpha = 1;
              ctx.shadowBlur = 0;
            }
          }
          
          currentY += LINE_HEIGHT;
        });
      } else {
        // Regular line - wrap if needed (using fixed MAX_CHARS)
        const wrappedLines = wrapLine(line, MAX_CHARS);
        
        wrappedLines.forEach((wrappedLine) => {
          if (currentY >= -LINE_HEIGHT * 2 && currentY <= height + LINE_HEIGHT) {
            const { color, glow, intensity } = getLineColor(line);

            // Draw phosphor glow (outer glow for CRT effect)
            ctx.shadowColor = glow;
            ctx.shadowBlur = 8 * intensity;
            ctx.fillStyle = color;
            ctx.fillText(wrappedLine, PADDING, currentY);

            // Draw secondary glow layer
            ctx.shadowBlur = 4 * intensity;
            ctx.globalAlpha = 0.7;
            ctx.fillText(wrappedLine, PADDING, currentY);

            // Draw sharp text on top
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;
            ctx.fillText(wrappedLine, PADDING, currentY);
          }

          currentY += LINE_HEIGHT;
        });
      }
    });
  }, [height, gameState, userInput, isFocused, cursorVisible, getLineColor, wrapLine, MAX_CHARS, FONT_FAMILY]);

  const drawCRTEffects = useCallback(() => {
    const effectCanvas = effectCanvasRef.current;
    if (!effectCanvas) return;

    const effectCtx = effectCanvas.getContext('2d');
    if (!effectCtx) return;

    // Clear effect canvas
    effectCtx.clearRect(0, 0, width, height);

    const time = Date.now();

    // 1. Horizontal scan lines (CRT raster lines)
    effectCtx.strokeStyle = 'rgba(0, 0, 0, 0.15)';
    effectCtx.lineWidth = 1;
    for (let y = 0; y < height; y += 3) {
      effectCtx.beginPath();
      effectCtx.moveTo(0, y);
      effectCtx.lineTo(width, y);
      effectCtx.stroke();
    }

    // 2. Moving scan line (electron beam)
    const scanLineY = (time / 25) % (height + 20) - 10;
    const scanGradient = effectCtx.createLinearGradient(0, scanLineY - 4, 0, scanLineY + 4);
    scanGradient.addColorStop(0, 'rgba(51, 255, 51, 0)');
    scanGradient.addColorStop(0.3, 'rgba(51, 255, 51, 0.03)');
    scanGradient.addColorStop(0.5, 'rgba(51, 255, 51, 0.08)');
    scanGradient.addColorStop(0.7, 'rgba(51, 255, 51, 0.03)');
    scanGradient.addColorStop(1, 'rgba(51, 255, 51, 0)');
    effectCtx.fillStyle = scanGradient;
    effectCtx.fillRect(0, scanLineY - 4, width, 8);

    // 3. Screen flicker (subtle)
    const flickerAmount = 0.01 + Math.sin(time / 100) * 0.005 + Math.random() * 0.005;
    effectCtx.fillStyle = `rgba(51, 255, 51, ${flickerAmount})`;
    effectCtx.fillRect(0, 0, width, height);

    // 4. Chromatic aberration (color fringing)
    const aberrationAmount = Math.sin(time / 3000) * 0.5;
    effectCtx.globalCompositeOperation = 'screen';
    effectCtx.fillStyle = 'rgba(255, 0, 0, 0.008)';
    effectCtx.fillRect(aberrationAmount, 0, width, height);
    effectCtx.fillStyle = 'rgba(0, 0, 255, 0.008)';
    effectCtx.fillRect(-aberrationAmount, 0, width, height);
    effectCtx.globalCompositeOperation = 'source-over';

    // 5. CRT curvature vignette
    const vignetteGradient = effectCtx.createRadialGradient(
      width / 2, height / 2, 0,
      width / 2, height / 2, Math.max(width, height) / 1.3
    );
    vignetteGradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    vignetteGradient.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
    vignetteGradient.addColorStop(0.8, 'rgba(0, 0, 0, 0.15)');
    vignetteGradient.addColorStop(1, 'rgba(0, 0, 0, 0.5)');
    effectCtx.fillStyle = vignetteGradient;
    effectCtx.fillRect(0, 0, width, height);

    // 6. Corner shadows (CRT bezel shadow)
    const cornerSize = 60;
    
    // Top-left corner
    const tlGradient = effectCtx.createRadialGradient(0, 0, 0, 0, 0, cornerSize);
    tlGradient.addColorStop(0, 'rgba(0, 0, 0, 0.4)');
    tlGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    effectCtx.fillStyle = tlGradient;
    effectCtx.fillRect(0, 0, cornerSize, cornerSize);

    // Top-right corner
    const trGradient = effectCtx.createRadialGradient(width, 0, 0, width, 0, cornerSize);
    trGradient.addColorStop(0, 'rgba(0, 0, 0, 0.4)');
    trGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    effectCtx.fillStyle = trGradient;
    effectCtx.fillRect(width - cornerSize, 0, cornerSize, cornerSize);

    // Bottom-left corner
    const blGradient = effectCtx.createRadialGradient(0, height, 0, 0, height, cornerSize);
    blGradient.addColorStop(0, 'rgba(0, 0, 0, 0.4)');
    blGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    effectCtx.fillStyle = blGradient;
    effectCtx.fillRect(0, height - cornerSize, cornerSize, cornerSize);

    // Bottom-right corner
    const brGradient = effectCtx.createRadialGradient(width, height, 0, width, height, cornerSize);
    brGradient.addColorStop(0, 'rgba(0, 0, 0, 0.4)');
    brGradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
    effectCtx.fillStyle = brGradient;
    effectCtx.fillRect(width - cornerSize, height - cornerSize, cornerSize, cornerSize);

    // 7. Scroll indicator
    if (maxScrollY > 0) {
      const scrollbarWidth = 4;
      const scrollbarHeight = height - 40;
      const scrollbarX = width - scrollbarWidth - 12;
      const scrollbarY = 20;

      // Scrollbar track
      effectCtx.fillStyle = 'rgba(51, 255, 51, 0.1)';
      effectCtx.fillRect(scrollbarX, scrollbarY, scrollbarWidth, scrollbarHeight);

      // Scrollbar thumb
      const thumbHeight = Math.max(30, (height / (maxScrollY + height)) * scrollbarHeight);
      const thumbY = scrollbarY + (scrollY / maxScrollY) * (scrollbarHeight - thumbHeight);

      effectCtx.fillStyle = 'rgba(51, 255, 51, 0.5)';
      effectCtx.shadowColor = CRT_COLORS.greenGlow;
      effectCtx.shadowBlur = 4;
      effectCtx.fillRect(scrollbarX, thumbY, scrollbarWidth, thumbHeight);
      effectCtx.shadowBlur = 0;
    }

    // 8. Processing indicator
    if (isProcessing) {
      const dots = Math.floor(time / 400) % 4;
      const processingText = '■ PROCESSING' + '.'.repeat(dots);

      effectCtx.font = '12px "Courier New", monospace';
      effectCtx.fillStyle = CRT_COLORS.amber;
      effectCtx.shadowColor = CRT_COLORS.amberGlow;
      effectCtx.shadowBlur = 8;
      effectCtx.textAlign = 'right';
      effectCtx.fillText(processingText, width - 16, height - 16);
      effectCtx.shadowBlur = 0;
    }

    // 9. Focus indicator
    if (!isFocused && gameState === 'interactive') {
      effectCtx.font = '11px "Courier New", monospace';
      effectCtx.fillStyle = 'rgba(51, 255, 51, 0.6)';
      effectCtx.textAlign = 'center';
      effectCtx.fillText('[ CLICK TO TYPE ]', width / 2, height - 16);
    }

    animationIdRef.current = requestAnimationFrame(drawCRTEffects);
  }, [width, height, maxScrollY, scrollY, isProcessing, isFocused, gameState]);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    const scrollSpeed = 60;
    const delta = e.deltaY > 0 ? scrollSpeed : -scrollSpeed;
    setScrollY(prev => Math.max(0, Math.min(maxScrollY, prev + delta)));
  }, [maxScrollY]);

  // Handle container click to focus
  const handleContainerClick = useCallback(() => {
    if (gameState === 'interactive' && hiddenInputRef.current) {
      hiddenInputRef.current.focus();
    }
  }, [gameState]);

  // Handle hidden input changes
  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    onInputChange(e.target.value);
  }, [onInputChange]);

  // Handle hidden input key events
  const handleInputKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !isProcessing) {
      e.preventDefault();
      onSubmit();
    } else if (e.key === 'Tab') {
      e.preventDefault();
      // Simple tab completion for commands
      const commands = ['help', 'clear', 'whoami', 'ps', 'status', 'exit'];
      const currentInput = userInput.toLowerCase();
      const matches = commands.filter(cmd => cmd.startsWith(currentInput));
      if (matches.length === 1) {
        onInputChange(matches[0]);
      }
    }
  }, [isProcessing, userInput, onInputChange, onSubmit]);

  // Handle focus events
  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  // Main rendering effect
  useEffect(() => {
    const canvas = canvasRef.current;
    const effectCanvas = effectCanvasRef.current;
    if (!canvas || !effectCanvas || width <= 0 || height <= 0) return;

    const ctx = canvas.getContext('2d');
    const effectCtx = effectCanvas.getContext('2d');
    if (!ctx || !effectCtx) return;

    // Set canvas resolution for crisp text
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    effectCanvas.width = width * dpr;
    effectCanvas.height = height * dpr;

    // Scale context to match device pixel ratio
    ctx.scale(dpr, dpr);
    effectCtx.scale(dpr, dpr);

    // Clear canvas with CRT screen background
    ctx.fillStyle = CRT_COLORS.background;
    ctx.fillRect(0, 0, width, height);

    // Split content into lines and calculate scroll bounds
    const lines = content.split('\n');
    const textHeight = calculateTextHeight(lines);
    const newMaxScrollY = Math.max(0, textHeight - height);
    
    // Update max scroll
    if (newMaxScrollY !== maxScrollY) {
      setMaxScrollY(newMaxScrollY);
      // Auto-scroll to bottom when new content is added
      if (newMaxScrollY > maxScrollY) {
        setScrollY(newMaxScrollY);
      }
    }

    // Draw terminal text with current scroll position
    drawTerminalText(ctx, lines, scrollY);

    // Start CRT effect animation
    drawCRTEffects();

    // Cleanup
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, [content, width, height, scrollY, maxScrollY, drawCRTEffects, calculateTextHeight, drawTerminalText]);

  // Add wheel event listener
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, [handleWheel]);

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={`matrix-rpg-canvas-container ${maxScrollY > 0 ? 'matrix-rpg-canvas-container--scrollable' : ''}`}
      onClick={handleContainerClick}
    >
      {/* Hidden input for proper keyboard handling */}
      <input
        ref={hiddenInputRef}
        type="text"
        value={userInput}
        onChange={handleInputChange}
        onKeyDown={handleInputKeyDown}
        onFocus={handleFocus}
        onBlur={handleBlur}
        disabled={gameState !== 'interactive' || isProcessing}
        style={{
          position: 'absolute',
          opacity: 0,
          pointerEvents: 'none',
          width: 0,
          height: 0,
        }}
        aria-label="Terminal input"
        autoComplete="off"
        autoCorrect="off"
        autoCapitalize="off"
        spellCheck={false}
      />
      
      {/* Main terminal canvas */}
      <canvas
        ref={canvasRef}
        className={`matrix-rpg-canvas matrix-rpg-canvas--main ${isFocused ? 'focused' : ''}`}
        style={{
          cursor: gameState === 'interactive' ? 'text' : 'default'
        }}
      />
      
      {/* CRT effects overlay canvas */}
      <canvas
        ref={effectCanvasRef}
        className="matrix-rpg-canvas matrix-rpg-canvas--effects"
      />
    </div>
  );
}

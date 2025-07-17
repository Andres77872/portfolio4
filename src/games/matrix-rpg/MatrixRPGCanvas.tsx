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
  const animationIdRef = useRef<number>();
  const [scrollY, setScrollY] = useState(0);
  const [maxScrollY, setMaxScrollY] = useState(0);
  const [isScrolling, setIsScrolling] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [cursorVisible, setCursorVisible] = useState(true);

  // Terminal rendering constants
  const LINE_HEIGHT = 16;
  const PADDING = 12;
  const FONT_FAMILY = 'bold 14px "Courier New", "Liberation Mono", monospace';
  const TERMINAL_GREEN = '#00ff00';
  const TERMINAL_BRIGHT_GREEN = '#44ff44';

  // Cursor blinking effect
  useEffect(() => {
    const cursorInterval = setInterval(() => {
      setCursorVisible(prev => !prev);
    }, 500);

    return () => clearInterval(cursorInterval);
  }, []);

  const calculateTextHeight = useCallback((lines: string[]) => {
    return lines.length * LINE_HEIGHT + PADDING * 2;
  }, []);

  const drawTerminalText = useCallback((ctx: CanvasRenderingContext2D, lines: string[], scrollOffset: number) => {
    ctx.font = FONT_FAMILY;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';

    let currentY = PADDING - scrollOffset;

    lines.forEach((line) => {
      // Only draw lines that are visible in the viewport
      if (currentY >= -LINE_HEIGHT && currentY <= height + LINE_HEIGHT) {
        // Color coding for different line types
        let color = TERMINAL_GREEN;
        let glowIntensity = 1;

        if (line.startsWith('[ OK ]')) {
          color = TERMINAL_BRIGHT_GREEN;
          glowIntensity = 1.5;
        } else if (line.startsWith('[ ERROR ]')) {
          color = '#ff4444';
          glowIntensity = 2;
        } else if (line.startsWith('[ WARN ]')) {
          color = '#ffaa00';
          glowIntensity = 1.3;
        } else if (line.startsWith('[ INFO ]')) {
          color = '#44aaff';
          glowIntensity = 1.2;
        } else if (line.startsWith('[SYSTEM]')) {
          color = '#ff8800';
          glowIntensity = 1.4;
        } else if (line.startsWith('Unknown Entity:')) {
          color = '#ff44ff';
          glowIntensity = 1.6;
        } else if (line.includes('@') && line.includes('$')) {
          // Command prompt
          color = TERMINAL_BRIGHT_GREEN;
          glowIntensity = 1.3;
        } else if (line.match(/^               /)) {
          // Wrapped continuation lines from Unknown Entity (15 spaces for "Unknown Entity: ")
          color = '#ff44ff';
          glowIntensity = 1.2;
        }

        // Draw text with glow effect
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 2 * glowIntensity;
        ctx.fillText(line, PADDING, currentY);

        // Add extra glow for emphasis
        ctx.shadowBlur = 6 * glowIntensity;
        ctx.globalAlpha = 0.4;
        ctx.fillText(line, PADDING, currentY);
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 1;
      }

      currentY += LINE_HEIGHT;
    });

    // Draw user input line if in interactive mode
    if (gameState === 'interactive' && currentY >= -LINE_HEIGHT && currentY <= height + LINE_HEIGHT) {
      const inputLine = userInput;
      const cursor = (isFocused && cursorVisible) ? '█' : '';
      const fullInputLine = inputLine + cursor;

      ctx.fillStyle = TERMINAL_GREEN;
      ctx.shadowColor = TERMINAL_GREEN;
      ctx.shadowBlur = 2;
      ctx.fillText(fullInputLine, PADDING, currentY);

      // Add glow effect
      ctx.shadowBlur = 6;
      ctx.globalAlpha = 0.4;
      ctx.fillText(fullInputLine, PADDING, currentY);
      ctx.globalAlpha = 1;
      ctx.shadowBlur = 1;
    }
  }, [height, gameState, userInput, isFocused, cursorVisible]);

  const drawCRTEffects = useCallback(() => {
    const effectCanvas = effectCanvasRef.current;
    if (!effectCanvas) return;

    const effectCtx = effectCanvas.getContext('2d');
    if (!effectCtx) return;

    // Clear effect canvas
    effectCtx.clearRect(0, 0, width, height);

    // Draw animated scan line
    const scanLineHeight = 2;
    const scanLineY = (Date.now() / 20) % (height + scanLineHeight);
    const scanLineGradient = effectCtx.createLinearGradient(0, scanLineY - scanLineHeight, 0, scanLineY + scanLineHeight);
    scanLineGradient.addColorStop(0, 'rgba(0, 255, 0, 0)');
    scanLineGradient.addColorStop(0.5, 'rgba(0, 255, 0, 0.4)');
    scanLineGradient.addColorStop(1, 'rgba(0, 255, 0, 0)');
    effectCtx.fillStyle = scanLineGradient;
    effectCtx.fillRect(0, scanLineY - scanLineHeight, width, scanLineHeight * 2);

    // Draw screen flicker with subtle variation
    const flickerOpacity = 0.015 + Math.sin(Date.now() / 80) * 0.01;
    effectCtx.fillStyle = `rgba(0, 255, 0, ${flickerOpacity})`;
    effectCtx.fillRect(0, 0, width, height);

    // Draw horizontal scan lines (CRT raster lines)
    effectCtx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
    effectCtx.lineWidth = 1;
    effectCtx.beginPath();
    for (let y = 0; y < height; y += 2) {
      effectCtx.moveTo(0, y);
      effectCtx.lineTo(width, y);
    }
    effectCtx.stroke();

    // Create curved screen vignette effect
    const gradient = effectCtx.createRadialGradient(
      width / 2, height / 2, 0,
      width / 2, height / 2, Math.max(width, height) / 1.4
    );
    gradient.addColorStop(0, 'rgba(0,0,0,0)');
    gradient.addColorStop(0.8, 'rgba(0,0,0,0.1)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.6)');
    effectCtx.fillStyle = gradient;
    effectCtx.fillRect(0, 0, width, height);

    // Add subtle color aberration effect
    const aberrationOffset = Math.sin(Date.now() / 2000) * 0.8;
    effectCtx.globalCompositeOperation = 'screen';
    effectCtx.fillStyle = `rgba(255, 0, 0, 0.01)`;
    effectCtx.fillRect(aberrationOffset, 0, width, height);
    effectCtx.fillStyle = `rgba(0, 0, 255, 0.01)`;
    effectCtx.fillRect(-aberrationOffset, 0, width, height);
    effectCtx.globalCompositeOperation = 'source-over';

    // Draw scroll indicator if scrollable
    if (maxScrollY > 0) {
      const scrollbarWidth = 4;
      const scrollbarHeight = height - 40;
      const scrollbarX = width - scrollbarWidth - 8;
      const scrollbarY = 20;

      // Scrollbar track
      effectCtx.fillStyle = 'rgba(0, 255, 0, 0.1)';
      effectCtx.fillRect(scrollbarX, scrollbarY, scrollbarWidth, scrollbarHeight);

      // Scrollbar thumb
      const thumbHeight = Math.max(20, (height / (maxScrollY + height)) * scrollbarHeight);
      const thumbY = scrollbarY + (scrollY / maxScrollY) * (scrollbarHeight - thumbHeight);

      effectCtx.fillStyle = 'rgba(0, 255, 0, 0.6)';
      effectCtx.fillRect(scrollbarX, thumbY, scrollbarWidth, thumbHeight);
    }

    // Add processing indicator
    if (isProcessing) {
      const dots = Math.floor(Date.now() / 300) % 4;
      const processingText = 'Processing' + '.'.repeat(dots);

      effectCtx.font = '12px "Courier New", monospace';
      effectCtx.fillStyle = 'rgba(0, 255, 0, 0.8)';
      effectCtx.textAlign = 'right';
      effectCtx.fillText(processingText, width - 10, height - 10);
    }

    animationIdRef.current = requestAnimationFrame(drawCRTEffects);
  }, [width, height, maxScrollY, scrollY, isProcessing]);

  const handleWheel = useCallback((e: WheelEvent) => {
    e.preventDefault();
    setIsScrolling(true);

    const scrollSpeed = 40;
    const newScrollY = Math.max(0, Math.min(maxScrollY, scrollY + e.deltaY * scrollSpeed / 100));
    setScrollY(newScrollY);

    // Auto-scroll to bottom when new content is added
    if (newScrollY >= maxScrollY - 10) {
      setScrollY(maxScrollY);
    }

    // Clear scrolling indicator after a delay
    setTimeout(() => setIsScrolling(false), 100);
  }, [scrollY, maxScrollY]);

  // Handle keyboard input
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (gameState !== 'interactive' || isProcessing) return;

    if (e.key === 'Enter') {
      e.preventDefault();
      onSubmit();
    } else if (e.key === 'Backspace') {
      e.preventDefault();
      onInputChange(userInput.slice(0, -1));
    } else if (e.key === 'Tab') {
      e.preventDefault();
      // Simple tab completion for commands
      const commands = ['help', 'clear', 'whoami', 'ps', 'status', 'exit'];
      const currentInput = userInput.toLowerCase();
      const matches = commands.filter(cmd => cmd.startsWith(currentInput));
      if (matches.length === 1) {
        onInputChange(matches[0]);
      }
    } else if (e.key.length === 1 && !e.ctrlKey && !e.altKey && !e.metaKey) {
      e.preventDefault();
      onInputChange(userInput + e.key);
    }
  }, [gameState, isProcessing, userInput, onInputChange, onSubmit]);

  // Handle focus events
  const handleFocus = useCallback(() => {
    setIsFocused(true);
  }, []);

  const handleBlur = useCallback(() => {
    setIsFocused(false);
  }, []);

  // Handle click to focus
  const handleClick = useCallback(() => {
    if (gameState === 'interactive') {
      const canvas = canvasRef.current;
      if (canvas) {
        canvas.focus();
      }
    }
  }, [gameState]);

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

    // Clear canvas with terminal background
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    // Split content into lines and calculate scroll bounds
    const lines = content.split('\n');
    const textHeight = calculateTextHeight(lines) + (gameState === 'interactive' ? LINE_HEIGHT : 0);
    const newMaxScrollY = Math.max(0, textHeight - height);
    setMaxScrollY(newMaxScrollY);

    // Auto-scroll to bottom when new content is added (but not during user scroll)
    if (!isScrolling && newMaxScrollY > maxScrollY) {
      setScrollY(newMaxScrollY);
    }

    // Draw terminal text with current scroll position
    drawTerminalText(ctx, lines, scrollY);

    // Start CRT effect animation
    drawCRTEffects();

    // Add event listeners
    canvas.addEventListener('wheel', handleWheel, { passive: false });
    canvas.addEventListener('keydown', handleKeyDown);
    canvas.addEventListener('focus', handleFocus);
    canvas.addEventListener('blur', handleBlur);
    canvas.addEventListener('click', handleClick);

    // Make canvas focusable
    canvas.tabIndex = 0;
    canvas.style.outline = 'none';

    // Auto-focus when in interactive mode
    if (gameState === 'interactive' && !isFocused) {
      setTimeout(() => canvas.focus(), 100);
    }

    // Cleanup
    return () => {
      canvas.removeEventListener('wheel', handleWheel);
      canvas.removeEventListener('keydown', handleKeyDown);
      canvas.removeEventListener('focus', handleFocus);
      canvas.removeEventListener('blur', handleBlur);
      canvas.removeEventListener('click', handleClick);
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
    };
  }, [content, width, height, scrollY, drawCRTEffects, handleWheel, calculateTextHeight, drawTerminalText, isScrolling, maxScrollY, handleKeyDown, handleFocus, handleBlur, handleClick, gameState, isFocused]);

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
      className={`matrix-rpg-canvas-container ${maxScrollY > 0 ? 'matrix-rpg-canvas-container--scrollable' : ''}`}
    >
      <canvas
        ref={canvasRef}
        className="matrix-rpg-canvas matrix-rpg-canvas--main"
        style={{
          outline: isFocused ? '1px solid rgba(0, 255, 0, 0.3)' : 'none',
          cursor: gameState === 'interactive' ? 'text' : 'default'
        }}
      />
      <canvas
        ref={effectCanvasRef}
        className="matrix-rpg-canvas matrix-rpg-canvas--effects"
      />
    </div>
  );
}

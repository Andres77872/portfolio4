import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GameState, TerminalStatus } from './types';
import type { TerminalCommand } from './useTerminal';

interface Props {
  content: string;
  width: number;
  height: number;
  gameState: GameState;
  userInput: string;
  isFocused: boolean;
  terminalStatus: TerminalStatus;
  completionMessage: string | null;
  suggestions: TerminalCommand[];
}

const CRT_COLORS = {
  phosphor: '#ffb000',
  phosphorBright: '#ffd166',
  phosphorDim: '#a66f00',
  green: '#4cff4c',
  amber: '#ffb000',
  red: '#ff5050',
  blue: '#66b7ff',
  magenta: '#ff7aff',
  background: '#050705',
};

const LINE_HEIGHT = 18;
const PADDING = 16;
const FONT_SIZE = 15;
const FONT_FAMILY = `${FONT_SIZE}px "Courier New", "Liberation Mono", monospace`;

export default function MatrixRPGCanvas({
  content,
  width,
  height,
  gameState,
  userInput,
  isFocused,
  terminalStatus,
  completionMessage,
  suggestions,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartYRef = useRef<number | null>(null);
  const textHeightRef = useRef(0);
  const maxScrollRef = useRef(0);
  const scrollRef = useRef(0);
  const wasAtBottomRef = useRef(true);

  const [scrollY, setScrollY] = useState(0);
  const [maxScrollY, setMaxScrollY] = useState(0);
  const [cursorVisible, setCursorVisible] = useState(true);
  const [hasNewOutputAwayFromBottom, setHasNewOutputAwayFromBottom] = useState(false);

  const isBoxLine = useCallback((line: string): boolean => /[─│┌┐└┘├┤┬┴┼╔╗╚╝╠╣╦╩╬═║━┃]/.test(line), []);

  const getMeasuredCharWidth = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.font = FONT_FAMILY;
    return Math.max(1, ctx.measureText('M').width || 9);
  }, []);

  const wrapLine = useCallback((line: string, maxChars: number): string[] => {
    if (isBoxLine(line)) return [line];
    if (line.length <= maxChars) return [line];

    const wrapped: string[] = [];
    let remaining = line;
    while (remaining.length > 0) {
      if (remaining.length <= maxChars) {
        wrapped.push(remaining);
        break;
      }
      let breakPoint = remaining.lastIndexOf(' ', maxChars);
      if (breakPoint <= 0) breakPoint = maxChars;
      wrapped.push(remaining.slice(0, breakPoint));
      remaining = remaining.slice(breakPoint).trimStart();
    }
    return wrapped;
  }, [isBoxLine]);

  const getLineColor = useCallback((line: string): string => {
    if (line.startsWith('[ OK ]')) return CRT_COLORS.green;
    if (line.startsWith('[ERROR]') || line.startsWith('[ ERROR ]')) return CRT_COLORS.red;
    if (line.startsWith('[WARN') || line.startsWith('WARNING:')) return CRT_COLORS.amber;
    if (line.startsWith('[INFO') || line.startsWith('[SYSTEM]') || line.startsWith('[STATE]')) return CRT_COLORS.blue;
    if (line.startsWith('[ABORTED]') || line === '^C') return CRT_COLORS.amber;
    if (line.startsWith('[HINT]') || line.startsWith('[TAB]') || line.startsWith('[COMPLETE]')) return CRT_COLORS.phosphorBright;
    if (line.startsWith('Unknown Entity:') || line.startsWith(' '.repeat(15))) return CRT_COLORS.magenta;
    if (line.includes('@') && line.includes('$')) return CRT_COLORS.phosphorBright;
    return CRT_COLORS.phosphor;
  }, []);

  const lines = useMemo(() => {
    const statusLines: string[] = [];
    if (completionMessage) statusLines.push(completionMessage);
    if (suggestions.length > 1) {
      statusLines.push(...suggestions.map(command => `  ${command.name.padEnd(8)} ${command.description}`));
    }
    if (terminalStatus === 'connecting') statusLines.push('[STATE] Connecting neural stream... Ctrl+C to interrupt.');
    if (terminalStatus === 'streaming') statusLines.push('[STATE] Streaming Unknown Entity response...');
    if (terminalStatus === 'error') statusLines.push('[ERROR] Stream failed; prompt restored.');
    if (terminalStatus === 'aborted') statusLines.push('[ABORTED] Neural stream interrupted; prompt restored.');
    return [...content.split('\n'), ...statusLines];
  }, [completionMessage, content, suggestions, terminalStatus]);

  const calculateTextHeight = useCallback((ctx: CanvasRenderingContext2D) => {
    const charWidth = getMeasuredCharWidth(ctx);
    const maxChars = Math.max(24, Math.floor((width - PADDING * 2) / charWidth));
    let totalLines = 0;

    lines.forEach((line, index) => {
      const isLastLine = index === content.split('\n').length - 1;
      const isPromptLine = line.includes('@') && line.endsWith('$ ');
      const fullLine = isLastLine && isPromptLine && gameState === 'interactive' ? line + userInput : line;
      totalLines += Math.max(1, wrapLine(fullLine, maxChars).length);
    });

    return totalLines * LINE_HEIGHT + PADDING * 2;
  }, [content, gameState, getMeasuredCharWidth, lines, userInput, width, wrapLine]);

  const drawScrollbar = useCallback((ctx: CanvasRenderingContext2D) => {
    if (maxScrollY <= 0) return;
    const scrollbarWidth = 4;
    const scrollbarHeight = height - 40;
    const scrollbarX = width - scrollbarWidth - 12;
    const scrollbarY = 20;
    const thumbHeight = Math.max(30, (height / (maxScrollY + height)) * scrollbarHeight);
    const thumbY = scrollbarY + (scrollY / maxScrollY) * (scrollbarHeight - thumbHeight);

    ctx.fillStyle = 'rgba(255, 176, 0, 0.16)';
    ctx.fillRect(scrollbarX, scrollbarY, scrollbarWidth, scrollbarHeight);
    ctx.fillStyle = 'rgba(255, 176, 0, 0.72)';
    ctx.fillRect(scrollbarX, thumbY, scrollbarWidth, thumbHeight);
  }, [height, maxScrollY, scrollY, width]);

  const drawTerminalText = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.font = FONT_FAMILY;
    ctx.textBaseline = 'top';
    ctx.textAlign = 'left';
    const charWidth = getMeasuredCharWidth(ctx);
    const maxChars = Math.max(24, Math.floor((width - PADDING * 2) / charWidth));
    const contentLineCount = content.split('\n').length;
    let currentY = PADDING - scrollY;

    lines.forEach((line, lineIndex) => {
      const isLastContentLine = lineIndex === contentLineCount - 1;
      const isPromptLine = line.includes('@') && line.endsWith('$ ');
      const fullLine = isLastContentLine && isPromptLine && gameState === 'interactive' ? line + userInput : line;
      const wrappedLines = wrapLine(fullLine, maxChars);

      wrappedLines.forEach((wrappedLine, wrapIndex) => {
        if (currentY >= -LINE_HEIGHT && currentY <= height + LINE_HEIGHT) {
          const color = getLineColor(line);
          ctx.shadowBlur = line.startsWith('[ERROR]') || line.includes('@') ? 4 : 0;
          ctx.shadowColor = color;
          ctx.fillStyle = color;
          ctx.fillText(wrappedLine, PADDING, currentY);
          ctx.shadowBlur = 0;

          if (isLastContentLine && isPromptLine && wrapIndex === wrappedLines.length - 1 && isFocused) {
            const cursorX = PADDING + wrappedLine.length * charWidth;
            ctx.fillStyle = cursorVisible ? CRT_COLORS.phosphorBright : 'transparent';
            ctx.fillText('█', cursorX, currentY);
          }
        }
        currentY += LINE_HEIGHT;
      });
    });

    if (terminalStatus === 'connecting' || terminalStatus === 'streaming') {
      ctx.fillStyle = CRT_COLORS.amber;
      ctx.textAlign = 'right';
      ctx.fillText(terminalStatus === 'connecting' ? '■ CONNECTING' : '■ STREAMING', width - 16, height - 18);
      ctx.textAlign = 'left';
    }

    if (!isFocused && gameState === 'interactive') {
      ctx.fillStyle = 'rgba(255, 176, 0, 0.72)';
      ctx.textAlign = 'center';
      ctx.fillText('[ CLICK / TAP TO TYPE — ? FOR HELP ]', width / 2, height - 18);
      ctx.textAlign = 'left';
    }

    drawScrollbar(ctx);
  }, [content, cursorVisible, drawScrollbar, gameState, getLineColor, getMeasuredCharWidth, height, isFocused, lines, scrollY, terminalStatus, userInput, width, wrapLine]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState !== 'hidden') setCursorVisible(previous => !previous);
    }, 530);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || width <= 0 || height <= 0) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const bufferWidth = Math.round(width * dpr);
    const bufferHeight = Math.round(height * dpr);
    if (canvas.width !== bufferWidth || canvas.height !== bufferHeight) {
      canvas.width = bufferWidth;
      canvas.height = bufferHeight;
    }
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, width, height);
    ctx.fillStyle = CRT_COLORS.background;
    ctx.fillRect(0, 0, width, height);

    const textHeight = calculateTextHeight(ctx);
    const newMaxScrollY = Math.max(0, textHeight - height);
    textHeightRef.current = textHeight;
    maxScrollRef.current = newMaxScrollY;

    if (newMaxScrollY !== maxScrollY) {
      setMaxScrollY(newMaxScrollY);
      if (wasAtBottomRef.current || scrollY >= maxScrollY - 4) {
        setScrollY(newMaxScrollY);
        scrollRef.current = newMaxScrollY;
        setHasNewOutputAwayFromBottom(false);
      } else if (newMaxScrollY > maxScrollY) {
        setHasNewOutputAwayFromBottom(true);
      }
    }

    drawTerminalText(ctx);
  }, [calculateTextHeight, drawTerminalText, height, maxScrollY, scrollY, width]);

  const updateScroll = useCallback((nextScroll: number) => {
    const clamped = Math.max(0, Math.min(maxScrollRef.current, nextScroll));
    scrollRef.current = clamped;
    wasAtBottomRef.current = clamped >= maxScrollRef.current - 4;
    if (wasAtBottomRef.current) setHasNewOutputAwayFromBottom(false);
    setScrollY(clamped);
  }, []);

  const handleWheel = useCallback((event: WheelEvent) => {
    event.preventDefault();
    updateScroll(scrollRef.current + event.deltaY);
  }, [updateScroll]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const handleTouchStart = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    touchStartYRef.current = event.touches[0]?.clientY ?? null;
  }, []);

  const handleTouchMove = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    const startY = touchStartYRef.current;
    const currentY = event.touches[0]?.clientY;
    if (startY === null || currentY === undefined) return;
    updateScroll(scrollRef.current + (startY - currentY));
    touchStartYRef.current = currentY;
  }, [updateScroll]);

  const jumpToBottom = useCallback((event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation();
    updateScroll(maxScrollRef.current);
  }, [updateScroll]);

  return (
    <div
      ref={containerRef}
      className={`matrix-rpg-canvas-container ${maxScrollY > 0 ? 'matrix-rpg-canvas-container--scrollable' : ''}`}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
    >
      <canvas
        ref={canvasRef}
        className={`matrix-rpg-canvas matrix-rpg-canvas--main ${isFocused ? 'focused' : ''}`}
        aria-hidden="true"
      />

      {hasNewOutputAwayFromBottom && (
        <button type="button" className="matrix-rpg-scroll-bottom" onClick={jumpToBottom}>
          ↓ new output
        </button>
      )}
    </div>
  );
}

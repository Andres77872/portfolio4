import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { GameState, TerminalStatus } from './types';
import type { TerminalCommand } from './useTerminal';
import { MAX_COLS, MIN_COLS } from './terminalFormat';

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
  /** The exact current prompt string, used to detect the live input line. */
  promptPrefix: string;
  /** Reports the character-column budget (minus scrollbar gutter) to the parent. */
  onMetrics?: (metrics: { cols: number }) => void;
  /** Height covered by an overlay at the bottom (the mobile input); kept clear of text. */
  bottomInset?: number;
}

const CRT_COLORS = {
  phosphor: '#ffb000',
  phosphorBright: '#ffd166',
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
const MIN_WRAP = 24;
const SCROLLBAR_GUTTER = 18;

const PROMPT_RE = /^[^\s@]+@[^\s:]+:\S*\$/;
const CMD_ERROR_RE = /^(cat|cd|ls|tree|decrypt|find|help|uname|pwd|echo): /;

const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));

const isBoxLine = (line: string): boolean =>
  /[─│┌┐└┘├┤┬┴┼╔╗╚╝╠╣╦╩╬═║━┃]/.test(line);

const wrapLine = (line: string, maxChars: number): string[] => {
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
};

const getLineColor = (line: string): string => {
  if (line.startsWith('[ OK ]') || line.startsWith('[RECOVERED]')) return CRT_COLORS.green;
  if (line.startsWith('[ERROR]') || line.startsWith('[ ERROR ]')) return CRT_COLORS.red;
  if (CMD_ERROR_RE.test(line)) return CRT_COLORS.red;
  if (line.startsWith('[WARN') || line.startsWith('WARNING:') || line.startsWith('[ENCRYPTED]')) return CRT_COLORS.amber;
  if (
    line.startsWith('[INFO') ||
    line.startsWith('[SYSTEM]') ||
    line.startsWith('[STATE]') ||
    line.startsWith('[SCAN]') ||
    line.startsWith('[DECRYPT]') ||
    line.startsWith('[MIRROR]')
  ) {
    return CRT_COLORS.blue;
  }
  if (line.startsWith('[ABORTED]') || line === '^C') return CRT_COLORS.amber;
  if (line.startsWith('[HINT]') || line.startsWith('[TAB]') || line.startsWith('[COMPLETE]')) return CRT_COLORS.phosphorBright;
  if (line.startsWith('Unknown Entity:') || line.startsWith('               ')) return CRT_COLORS.magenta;
  if (PROMPT_RE.test(line)) return CRT_COLORS.phosphorBright;
  return CRT_COLORS.phosphor;
};

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
  promptPrefix,
  onMetrics,
  bottomInset = 0,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const touchStartYRef = useRef<number | null>(null);
  const maxScrollRef = useRef(0);
  const scrollRef = useRef(0);
  const wasAtBottomRef = useRef(true);

  const [charWidth, setCharWidth] = useState(9);
  const [scrollY, setScrollY] = useState(0);
  const [maxScrollY, setMaxScrollY] = useState(0);
  const [cursorVisible, setCursorVisible] = useState(true);
  const [hasNewOutputAwayFromBottom, setHasNewOutputAwayFromBottom] = useState(false);

  // Measure the monospace character width once (constant for the fixed font).
  useEffect(() => {
    const ctx = canvasRef.current?.getContext('2d');
    if (!ctx) return;
    ctx.font = FONT_FAMILY;
    setCharWidth(Math.max(1, ctx.measureText('M').width || 9));
  }, []);

  const maxChars = useMemo(
    () => Math.max(MIN_WRAP, Math.floor((width - PADDING * 2) / charWidth)),
    [width, charWidth],
  );

  // Column budget handed to command formatters: leave room for the scrollbar.
  const reportedCols = useMemo(
    () => clamp(Math.floor((width - PADDING * 2 - SCROLLBAR_GUTTER) / charWidth), MIN_COLS, MAX_COLS),
    [width, charWidth],
  );

  useEffect(() => {
    onMetrics?.({ cols: reportedCols });
  }, [onMetrics, reportedCols]);

  const contentLines = useMemo(() => content.split('\n'), [content]);

  const isLivePrompt =
    gameState === 'interactive' && contentLines[contentLines.length - 1] === promptPrefix;

  // All static lines (scrollback + transient status), excluding the live prompt
  // tail so this heavy wrap is memoized and does NOT re-run on every keystroke.
  const staticLines = useMemo(() => {
    const statusLines: string[] = [];
    if (completionMessage) statusLines.push(completionMessage);
    if (suggestions.length > 1) {
      statusLines.push(...suggestions.map((command) => `  ${command.name.padEnd(9)} ${command.description}`));
    }
    if (terminalStatus === 'connecting') statusLines.push('[STATE] Connecting neural stream... Ctrl+C to interrupt.');
    if (terminalStatus === 'streaming') statusLines.push('[STATE] Streaming Unknown Entity response...');
    if (terminalStatus === 'error') statusLines.push('[ERROR] Stream failed; prompt restored.');
    if (terminalStatus === 'aborted') statusLines.push('[ABORTED] Neural stream interrupted; prompt restored.');
    const base = isLivePrompt ? contentLines.slice(0, -1) : contentLines;
    return [...base, ...statusLines];
  }, [completionMessage, contentLines, isLivePrompt, suggestions, terminalStatus]);

  const wrappedStatic = useMemo(() => {
    const rows: { text: string; source: string }[] = [];
    for (const line of staticLines) {
      for (const segment of wrapLine(line, maxChars)) rows.push({ text: segment, source: line });
    }
    return rows;
  }, [staticLines, maxChars]);

  // The live prompt line (prompt + typed input) — cheap, single-line wrap.
  const livePromptRows = useMemo(
    () => (isLivePrompt ? wrapLine(promptPrefix + userInput, maxChars) : []),
    [isLivePrompt, maxChars, promptPrefix, userInput],
  );

  const totalRows = wrappedStatic.length + livePromptRows.length;

  const drawScrollbar = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      if (maxScrollY <= 0) return;
      const scrollbarWidth = 4;
      const scrollbarHeight = height - 40 - bottomInset;
      const scrollbarX = width - scrollbarWidth - 12;
      const scrollbarY = 20;
      const thumbHeight = Math.max(30, (height / (maxScrollY + height)) * scrollbarHeight);
      const thumbY = scrollbarY + (scrollY / maxScrollY) * (scrollbarHeight - thumbHeight);

      ctx.fillStyle = 'rgba(255, 176, 0, 0.16)';
      ctx.fillRect(scrollbarX, scrollbarY, scrollbarWidth, scrollbarHeight);
      ctx.fillStyle = 'rgba(255, 176, 0, 0.72)';
      ctx.fillRect(scrollbarX, thumbY, scrollbarWidth, thumbHeight);
    },
    [bottomInset, height, maxScrollY, scrollY, width],
  );

  const drawTerminalText = useCallback(
    (ctx: CanvasRenderingContext2D) => {
      ctx.font = FONT_FAMILY;
      ctx.textBaseline = 'top';
      ctx.textAlign = 'left';
      let currentY = PADDING - scrollY;

      const paintRow = (text: string, source: string, isPromptTail: boolean) => {
        if (currentY >= -LINE_HEIGHT && currentY <= height + LINE_HEIGHT) {
          const color = getLineColor(source);
          ctx.shadowBlur = source.startsWith('[ERROR]') || PROMPT_RE.test(source) ? 4 : 0;
          ctx.shadowColor = color;
          ctx.fillStyle = color;
          ctx.fillText(text, PADDING, currentY);
          ctx.shadowBlur = 0;

          if (isPromptTail && isFocused) {
            const cursorX = PADDING + text.length * charWidth;
            ctx.fillStyle = cursorVisible ? CRT_COLORS.phosphorBright : 'transparent';
            ctx.fillText('█', cursorX, currentY);
          }
        }
        currentY += LINE_HEIGHT;
      };

      for (const row of wrappedStatic) paintRow(row.text, row.source, false);
      livePromptRows.forEach((text, index) =>
        paintRow(text, promptPrefix, index === livePromptRows.length - 1),
      );

      if (terminalStatus === 'connecting' || terminalStatus === 'streaming') {
        ctx.fillStyle = CRT_COLORS.amber;
        ctx.textAlign = 'right';
        ctx.fillText(terminalStatus === 'connecting' ? '■ CONNECTING' : '■ STREAMING', width - 16, height - 18 - bottomInset);
        ctx.textAlign = 'left';
      }

      if (!isFocused && gameState === 'interactive') {
        ctx.fillStyle = 'rgba(255, 176, 0, 0.72)';
        ctx.textAlign = 'center';
        ctx.fillText('[ CLICK / TAP TO TYPE — ? FOR HELP ]', width / 2, height - 18 - bottomInset);
        ctx.textAlign = 'left';
      }

      drawScrollbar(ctx);
    },
    [bottomInset, charWidth, cursorVisible, drawScrollbar, gameState, height, isFocused, livePromptRows, promptPrefix, terminalStatus, wrappedStatic, width, scrollY],
  );

  useEffect(() => {
    const interval = window.setInterval(() => {
      if (document.visibilityState !== 'hidden') setCursorVisible((previous) => !previous);
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

    const textHeight = totalRows * LINE_HEIGHT + PADDING * 2 + bottomInset;
    const newMaxScrollY = Math.max(0, textHeight - height);
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
  }, [bottomInset, drawTerminalText, height, maxScrollY, scrollY, totalRows, width]);

  const updateScroll = useCallback((nextScroll: number) => {
    const clamped = Math.max(0, Math.min(maxScrollRef.current, nextScroll));
    scrollRef.current = clamped;
    wasAtBottomRef.current = clamped >= maxScrollRef.current - 4;
    if (wasAtBottomRef.current) setHasNewOutputAwayFromBottom(false);
    setScrollY(clamped);
  }, []);

  const handleWheel = useCallback(
    (event: WheelEvent) => {
      event.preventDefault();
      updateScroll(scrollRef.current + event.deltaY);
    },
    [updateScroll],
  );

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;
    container.addEventListener('wheel', handleWheel, { passive: false });
    return () => container.removeEventListener('wheel', handleWheel);
  }, [handleWheel]);

  const handleTouchStart = useCallback((event: React.TouchEvent<HTMLDivElement>) => {
    touchStartYRef.current = event.touches[0]?.clientY ?? null;
  }, []);

  const handleTouchMove = useCallback(
    (event: React.TouchEvent<HTMLDivElement>) => {
      const startY = touchStartYRef.current;
      const currentY = event.touches[0]?.clientY;
      if (startY === null || currentY === undefined) return;
      updateScroll(scrollRef.current + (startY - currentY));
      touchStartYRef.current = currentY;
    },
    [updateScroll],
  );

  const jumpToBottom = useCallback(
    (event: React.MouseEvent<HTMLButtonElement>) => {
      event.stopPropagation();
      updateScroll(maxScrollRef.current);
    },
    [updateScroll],
  );

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

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent, PointerEvent as ReactPointerEvent } from 'react';
import { Dices, Grid3x3, Info, Pause, Play, StepForward, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useElementSize } from '@/hooks/useElementSize';
import { useInViewport } from '@/hooks/useInViewport';
import { cn } from '@/lib/utils';
import SegmentedControl, { type SegmentedOption } from '../shared/SegmentedControl';
import { LifeWorld, TRAIL_LENGTH, parseRule, type LifeStatus } from './life';
import { PATTERNS, RULE_PRESETS, getPattern } from './patterns';

type SpeedId = 'slow' | 'normal' | 'fast' | 'max';

const SPEEDS: Record<SpeedId, number> = { slow: 3, normal: 10, fast: 30, max: 60 };
const SPEED_OPTIONS: SegmentedOption<SpeedId>[] = [
  { value: 'slow', label: '3/s', title: '3 generations per second' },
  { value: 'normal', label: '10/s', title: '10 generations per second' },
  { value: 'fast', label: '30/s', title: '30 generations per second' },
  { value: 'max', label: '60/s', title: '60 generations per second' },
];

const DRAW = 'draw';
const RANDOM_DENSITY = 0.28;
const STATS_INTERVAL_MS = 120;

interface Palette {
  background: string;
  alive: string;
  young: string;
  grid: string;
}

interface Stats {
  generation: number;
  population: number;
  status: LifeStatus;
  history: number[];
}

interface Cell {
  x: number;
  y: number;
}

const readStats = (world: LifeWorld): Stats => ({
  generation: world.generation,
  population: world.population,
  status: world.status,
  history: world.history.slice(),
});

const statusLabel = (status: LifeStatus): string => {
  switch (status.kind) {
    case 'extinct':
      return 'Extinct';
    case 'still':
      return 'Still life';
    case 'oscillating':
      return `Oscillating · period ${status.period}`;
    default:
      return 'Evolving';
  }
};

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  typeof window.matchMedia === 'function' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function readPalette(element: Element, dark: boolean): Palette {
  const style = getComputedStyle(element);
  const token = (name: string, fallback: string) => style.getPropertyValue(name).trim() || fallback;
  return {
    background: token('--card', dark ? '#18181b' : '#fcfcfc'),
    alive: token('--primary', '#6366f1'),
    young: dark ? token('--indigo-300', '#a5b4fc') : token('--indigo-400', '#818cf8'),
    grid: token('--border', dark ? '#27272a' : '#d4d4d8'),
  };
}

/** Cells on the straight line between two cells (Bresenham), so fast drags leave no gaps. */
function lineCells(from: Cell, to: Cell): Cell[] {
  const cells: Cell[] = [];
  let { x, y } = from;
  const dx = Math.abs(to.x - x);
  const dy = -Math.abs(to.y - y);
  const sx = x < to.x ? 1 : -1;
  const sy = y < to.y ? 1 : -1;
  let error = dx + dy;
  for (;;) {
    cells.push({ x, y });
    if (x === to.x && y === to.y) return cells;
    const doubled = 2 * error;
    if (doubled >= dy) {
      error += dy;
      x += sx;
    }
    if (doubled <= dx) {
      error += dx;
      y += sy;
    }
  }
}

function Sparkline({ values }: { values: number[] }) {
  if (values.length < 2) return <span className="h-4 w-20" aria-hidden="true" />;
  const max = Math.max(1, ...values);
  const points = values
    .map((value, index) => `${((index / (values.length - 1)) * 80).toFixed(1)},${(15 - (value / max) * 14).toFixed(1)}`)
    .join(' ');
  return (
    <svg width={80} height={16} aria-hidden="true" className="shrink-0 overflow-visible">
      <polyline points={points} fill="none" className="stroke-primary" strokeWidth={1.25} strokeLinejoin="round" />
    </svg>
  );
}

interface GameOfLifeProps {
  className?: string;
}

export default function GameOfLife({ className }: GameOfLifeProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [surfaceRef, surface] = useElementSize<HTMLDivElement>();
  const inViewport = useInViewport(rootRef);

  const [playing, setPlaying] = useState(() => !prefersReducedMotion());
  const [speed, setSpeed] = useState<SpeedId>('normal');
  const [ruleId, setRuleId] = useState(RULE_PRESETS[0].id);
  const [patternId, setPatternId] = useState<string>(DRAW);
  const [stats, setStats] = useState<Stats | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [announcement, setAnnouncement] = useState('');

  const worldRef = useRef<LifeWorld | null>(null);
  const paletteRef = useRef<Palette | null>(null);
  const hoverRef = useRef<Cell | null>(null);
  const paintRef = useRef<{ alive: boolean; last: Cell } | null>(null);
  const lastStatsRef = useRef(0);
  const speedRef = useRef(speed);
  const patternRef = useRef(patternId);
  const infoButtonRef = useRef<HTMLButtonElement>(null);

  const preset = RULE_PRESETS.find((item) => item.id === ruleId) ?? RULE_PRESETS[0];
  const rule = useMemo(() => parseRule(preset.notation), [preset.notation]);
  const ruleRef = useRef(rule);
  const pattern = patternId === DRAW ? null : PATTERNS.find((item) => item.id === patternId) ?? null;

  useEffect(() => {
    speedRef.current = speed;
  }, [speed]);
  useEffect(() => {
    ruleRef.current = rule;
  }, [rule]);

  // Grid geometry: fixed-size square cells, as many as fit, centred in the surface.
  const cellSize = surface.width < 420 ? 7 : 8;
  const cols = Math.floor(surface.width / cellSize);
  const rows = Math.floor(surface.height / cellSize);
  const geometryRef = useRef({ cellSize, cols, rows, width: 0, height: 0, offsetX: 0, offsetY: 0 });

  const publish = useCallback((force = false) => {
    const world = worldRef.current;
    if (!world) return;
    const now = performance.now();
    if (!force && now - lastStatsRef.current < STATS_INTERVAL_MS) return;
    lastStatsRef.current = now;
    setStats(readStats(world));
  }, []);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const world = worldRef.current;
    const palette = paletteRef.current;
    if (!canvas || !world || !palette) return;
    let ctx: CanvasRenderingContext2D | null = null;
    try {
      ctx = canvas.getContext('2d');
    } catch {
      return;
    }
    if (!ctx) return;

    const { cellSize: size, width, height, offsetX, offsetY } = geometryRef.current;
    const dpr = window.devicePixelRatio || 1;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalAlpha = 1;
    ctx.fillStyle = palette.background;
    ctx.fillRect(0, 0, width, height);

    const { cols: worldCols, rows: worldRows, cells, age, trail } = world;
    const gridW = worldCols * size;
    const gridH = worldRows * size;

    ctx.strokeStyle = palette.grid;
    ctx.globalAlpha = 0.55;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let x = 0; x <= worldCols; x += 1) {
      ctx.moveTo(offsetX + x * size + 0.5, offsetY);
      ctx.lineTo(offsetX + x * size + 0.5, offsetY + gridH);
    }
    for (let y = 0; y <= worldRows; y += 1) {
      ctx.moveTo(offsetX, offsetY + y * size + 0.5);
      ctx.lineTo(offsetX + gridW, offsetY + y * size + 0.5);
    }
    ctx.stroke();

    const fillCell = (index: number) => {
      const x = index % worldCols;
      const y = (index - x) / worldCols;
      ctx.fillRect(offsetX + x * size + 1, offsetY + y * size + 1, size - 1, size - 1);
    };

    // Fading trails of recently dead cells.
    ctx.fillStyle = palette.alive;
    for (let level = TRAIL_LENGTH; level >= 1; level -= 1) {
      ctx.globalAlpha = (level / TRAIL_LENGTH) * 0.22;
      for (let i = 0; i < trail.length; i += 1) if (trail[i] === level) fillCell(i);
    }

    // Live cells: newborns in a lighter tint, settled cells in the accent colour.
    ctx.globalAlpha = 1;
    ctx.fillStyle = palette.young;
    for (let i = 0; i < cells.length; i += 1) if (cells[i] === 1 && age[i] === 0) fillCell(i);
    ctx.fillStyle = palette.alive;
    for (let i = 0; i < cells.length; i += 1) if (cells[i] === 1 && age[i] > 0) fillCell(i);

    // Ghost preview of the pattern about to be stamped.
    const hover = hoverRef.current;
    const stamp = patternRef.current === DRAW ? null : getPattern(patternRef.current);
    if (stamp && hover) {
      ctx.globalAlpha = 0.4;
      ctx.fillStyle = palette.young;
      const originX = hover.x - Math.floor(stamp.width / 2);
      const originY = hover.y - Math.floor(stamp.height / 2);
      for (const [dx, dy] of stamp.cells) fillCell(world.index(originX + dx, originY + dy));
    }
    ctx.globalAlpha = 1;
  }, []);

  // Size the canvas backing store and (re)build the world whenever the surface changes.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || cols < 4 || rows < 4) return;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = Math.round(surface.width * dpr);
    canvas.height = Math.round(surface.height * dpr);
    geometryRef.current = {
      cellSize,
      cols,
      rows,
      width: surface.width,
      height: surface.height,
      offsetX: Math.floor((surface.width - cols * cellSize) / 2),
      offsetY: Math.floor((surface.height - rows * cellSize) / 2),
    };

    if (!worldRef.current) {
      const world = new LifeWorld(cols, rows);
      world.randomize(RANDOM_DENSITY);
      worldRef.current = world;
    } else {
      worldRef.current.resize(cols, rows);
    }
    draw();
    publish(true);
  }, [cellSize, cols, rows, surface.width, surface.height, draw, publish]);

  // Canvas colours come from the theme tokens. next-themes flips the `dark` class on
  // <html> after its consumers' effects have run, so watch the attribute itself rather
  // than reacting to the theme value (which would read the previous theme's colours).
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const update = () => {
      paletteRef.current = readPalette(root, document.documentElement.classList.contains('dark'));
      draw();
    };
    update();
    if (typeof MutationObserver === 'undefined') return;
    const observer = new MutationObserver(update);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class', 'style'] });
    return () => observer.disconnect();
  }, [draw]);

  useEffect(() => {
    patternRef.current = patternId;
    draw();
  }, [patternId, draw]);

  // Simulation loop: runs only while playing and on screen.
  useEffect(() => {
    if (!playing || !inViewport) return;
    let frame = 0;
    let previous = performance.now();
    let pending = 0;

    const loop = (time: number) => {
      const world = worldRef.current;
      pending += (Math.min(250, time - previous) * SPEEDS[speedRef.current]) / 1000;
      previous = time;
      let steps = 0;
      while (world && pending >= 1 && steps < 4) {
        world.step(ruleRef.current);
        pending -= 1;
        steps += 1;
      }
      if (steps > 0) {
        draw();
        publish();
      }
      frame = requestAnimationFrame(loop);
    };

    frame = requestAnimationFrame(loop);
    return () => {
      cancelAnimationFrame(frame);
      publish(true);
    };
  }, [playing, inViewport, draw, publish]);

  const togglePlay = useCallback(() => {
    setPlaying(!playing);
    setAnnouncement(playing ? 'Paused.' : 'Running.');
  }, [playing]);

  const stepOnce = useCallback(() => {
    const world = worldRef.current;
    if (!world) return;
    setPlaying(false);
    world.step(ruleRef.current);
    draw();
    publish(true);
  }, [draw, publish]);

  const randomize = useCallback(() => {
    worldRef.current?.randomize(RANDOM_DENSITY);
    draw();
    publish(true);
    setAnnouncement('Random soup: about a quarter of the cells alive.');
  }, [draw, publish]);

  const clear = useCallback(() => {
    worldRef.current?.clear();
    draw();
    publish(true);
    setAnnouncement('Grid cleared. Draw cells or stamp a pattern.');
  }, [draw, publish]);

  const choosePattern = (id: string) => {
    setPatternId(id);
    const chosen = PATTERNS.find((item) => item.id === id);
    setAnnouncement(chosen ? `${chosen.name}: click the grid to place it. Escape returns to drawing.` : 'Drawing mode.');
  };

  const chooseRule = (id: string) => {
    setRuleId(id);
    const chosen = RULE_PRESETS.find((item) => item.id === id);
    if (chosen) setAnnouncement(`Rule ${chosen.notation}: ${chosen.description}`);
  };

  const cellAt = (event: ReactPointerEvent<HTMLCanvasElement>): Cell | null => {
    const world = worldRef.current;
    if (!world) return null;
    const rect = event.currentTarget.getBoundingClientRect();
    const { cellSize: size, offsetX, offsetY } = geometryRef.current;
    const x = Math.floor((event.clientX - rect.left - offsetX) / size);
    const y = Math.floor((event.clientY - rect.top - offsetY) / size);
    if (x < 0 || y < 0 || x >= world.cols || y >= world.rows) return null;
    return { x, y };
  };

  const handlePointerDown = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return;
    const world = worldRef.current;
    const cell = cellAt(event);
    if (!world || !cell) return;
    event.preventDefault();
    event.currentTarget.focus({ preventScroll: true });

    const stamp = pattern ? getPattern(pattern.id) : null;
    if (stamp) {
      world.stamp(stamp.cells, cell.x - Math.floor(stamp.width / 2), cell.y - Math.floor(stamp.height / 2));
    } else {
      const alive = !world.get(cell.x, cell.y);
      world.set(cell.x, cell.y, alive);
      paintRef.current = { alive, last: cell };
      event.currentTarget.setPointerCapture?.(event.pointerId);
    }
    draw();
    publish(true);
  };

  const handlePointerMove = (event: ReactPointerEvent<HTMLCanvasElement>) => {
    const cell = cellAt(event);
    const hover = hoverRef.current;
    const moved = !cell || !hover || cell.x !== hover.x || cell.y !== hover.y;
    hoverRef.current = cell;

    const paint = paintRef.current;
    const world = worldRef.current;
    if (paint && cell && world && moved) {
      for (const point of lineCells(paint.last, cell)) world.set(point.x, point.y, paint.alive);
      paint.last = cell;
      draw();
      publish();
      return;
    }
    if (moved && pattern) draw();
  };

  const endPaint = () => {
    if (paintRef.current) publish(true);
    paintRef.current = null;
  };

  const handlePointerLeave = () => {
    hoverRef.current = null;
    if (pattern) draw();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey || showInfo) return;
    const target = event.target as HTMLElement;
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(target.tagName)) return;
    switch (event.key) {
      case ' ':
        if (target.tagName === 'BUTTON') return;
        event.preventDefault();
        togglePlay();
        break;
      case 'n':
      case 'N':
      case 'ArrowRight':
        event.preventDefault();
        stepOnce();
        break;
      case 'r':
      case 'R':
        randomize();
        break;
      case 'c':
      case 'C':
        clear();
        break;
      case 'Escape':
        if (patternId !== DRAW) choosePattern(DRAW);
        break;
    }
  };

  const closeInfo = () => {
    setShowInfo(false);
    requestAnimationFrame(() => infoButtonRef.current?.focus());
  };

  const selectClass =
    'h-7 min-w-0 rounded-md border border-border bg-background px-1.5 text-[11px] font-medium text-foreground focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-ring';

  return (
    <div
      ref={rootRef}
      onKeyDown={handleKeyDown}
      className={cn(
        '@container relative flex h-full w-full flex-col overflow-hidden rounded-lg border border-border bg-card text-card-foreground',
        className,
      )}
    >
      {/* Header */}
      <div className="flex h-10 shrink-0 items-center gap-2 border-b border-border px-3">
        <Grid3x3 aria-hidden="true" className="size-4 shrink-0 text-primary" />
        <h3 className="text-sm font-semibold whitespace-nowrap">Game of Life</h3>
        <span className="hidden font-mono text-[10px] uppercase tracking-wide text-muted-foreground @md:inline">
          {rule.notation} · {cols}×{rows} torus
        </span>
        <div className="ml-auto flex min-w-0 items-center gap-1.5">
          <label className="sr-only" htmlFor="life-rule">
            Rule
          </label>
          <select id="life-rule" value={ruleId} onChange={(event) => chooseRule(event.target.value)} className={selectClass} title={preset.description}>
            {RULE_PRESETS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name} ({item.notation})
              </option>
            ))}
          </select>
          <Button ref={infoButtonRef} variant="ghost" size="icon-xs" aria-label="How it works" title="How it works" onClick={() => setShowInfo(true)}>
            <Info />
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="flex h-7 shrink-0 items-center gap-3 border-b border-border px-3 font-mono text-[10px] tabular-nums text-muted-foreground">
        <span>
          Gen <strong className="font-semibold text-foreground">{(stats?.generation ?? 0).toLocaleString()}</strong>
        </span>
        <span>
          Pop <strong className="font-semibold text-foreground">{(stats?.population ?? 0).toLocaleString()}</strong>
        </span>
        <span className={cn('truncate', stats?.status.kind === 'extinct' && 'text-destructive', (stats?.status.kind === 'still' || stats?.status.kind === 'oscillating') && 'text-success')}>
          {stats ? statusLabel(stats.status) : '—'}
        </span>
        <span className="ml-auto flex items-center gap-2">
          <Sparkline values={stats?.history ?? []} />
        </span>
      </div>

      {/* Grid */}
      <div ref={surfaceRef} className="relative min-h-0 flex-1">
        <canvas
          ref={canvasRef}
          tabIndex={0}
          role="img"
          aria-label={`Game of Life grid, ${cols} by ${rows} cells. Generation ${stats?.generation ?? 0}, population ${stats?.population ?? 0}. Click or drag to toggle cells; Space plays or pauses.`}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={endPaint}
          onPointerCancel={endPaint}
          onLostPointerCapture={endPaint}
          onPointerLeave={handlePointerLeave}
          className={cn(
            'absolute inset-0 size-full touch-none outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset',
            pattern ? 'cursor-copy' : 'cursor-crosshair',
          )}
        />
        {pattern && (
          <div className="pointer-events-none absolute inset-x-2 top-2 flex justify-center">
            <p className="pointer-events-auto flex items-center gap-1.5 rounded-full border border-border bg-card/95 py-0.5 pr-0.5 pl-2.5 text-[11px] shadow-sm">
              <span className="truncate">
                Click to place <strong>{pattern.name}</strong>
              </span>
              <Button variant="ghost" size="icon-xs" className="rounded-full" aria-label="Stop placing patterns" onClick={() => choosePattern(DRAW)}>
                <X />
              </Button>
            </p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex shrink-0 flex-wrap items-center gap-1.5 border-t border-border px-3 py-2">
        <Button size="sm" onClick={togglePlay} className="w-[84px]">
          {playing ? <Pause /> : <Play />}
          {playing ? 'Pause' : 'Play'}
        </Button>
        <Button size="icon-sm" variant="outline" onClick={stepOnce} aria-label="Step one generation" title="Step one generation (N)">
          <StepForward />
        </Button>
        <Button size="icon-sm" variant="ghost" onClick={randomize} aria-label="Random soup" title="Random soup (R)">
          <Dices />
        </Button>
        <Button size="icon-sm" variant="ghost" onClick={clear} aria-label="Clear the grid" title="Clear the grid (C)">
          <Trash2 />
        </Button>
        <label className="sr-only" htmlFor="life-pattern">
          Pattern
        </label>
        <select
          id="life-pattern"
          value={patternId}
          onChange={(event) => choosePattern(event.target.value)}
          className={cn(selectClass, 'max-w-[150px] @max-md:max-w-[120px]')}
          title={pattern?.description ?? 'Click or drag on the grid to toggle cells'}
        >
          <option value={DRAW}>Draw cells</option>
          <optgroup label="Stamp a pattern">
            {PATTERNS.map((item) => (
              <option key={item.id} value={item.id}>
                {item.name}
              </option>
            ))}
          </optgroup>
        </select>
        <SegmentedControl label="Simulation speed" options={SPEED_OPTIONS} value={speed} onChange={setSpeed} className="ml-auto" />
      </div>

      {showInfo && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="life-info-title"
          className="absolute inset-0 z-30 flex flex-col bg-card"
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.stopPropagation();
              closeInfo();
            }
          }}
        >
          <div className="flex items-center justify-between border-b border-border px-4 py-2">
            <h4 id="life-info-title" className="text-sm font-semibold">
              Conway’s Game of Life
            </h4>
            <Button autoFocus variant="ghost" size="icon-xs" onClick={closeInfo} aria-label="Close explanation">
              <X />
            </Button>
          </div>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-3 text-xs leading-relaxed text-muted-foreground">
            <p>
              A zero-player game invented by John Conway in 1970. Each square is a cell, alive or dead. Every generation,
              all cells update at once by counting their eight neighbours:
            </p>
            <ul className="space-y-1 pl-4 [&>li]:list-disc">
              <li>
                <strong className="text-foreground">Birth</strong>: a dead cell with exactly 3 live neighbours comes alive.
              </li>
              <li>
                <strong className="text-foreground">Survival</strong>: a live cell with 2 or 3 neighbours lives on.
              </li>
              <li>
                <strong className="text-foreground">Death</strong>: any other live cell dies, of loneliness or overcrowding.
              </li>
            </ul>
            <p>
              That is rule <code className="font-mono text-foreground">B3/S23</code>. From it emerge still lifes,
              oscillators, spaceships that glide across the grid and guns that fire them forever. Life is even Turing
              complete. The other presets change only the B/S numbers. The grid is a torus: cells leaving one edge come
              back on the opposite one.
            </p>
            <p>
              Newborn cells are drawn lighter and dead cells leave a fading trail. The status line spots still lifes and
              oscillators by hashing each generation and watching for repeats.
            </p>
            <p>
              <strong className="text-foreground">Controls</strong>: click or drag to draw (dragging from a live cell
              erases). Pick a pattern to stamp it where you click. Keys: <kbd className="font-mono text-foreground">Space</kbd>{' '}
              play/pause, <kbd className="font-mono text-foreground">N</kbd> step, <kbd className="font-mono text-foreground">R</kbd>{' '}
              random, <kbd className="font-mono text-foreground">C</kbd> clear, <kbd className="font-mono text-foreground">Esc</kbd>{' '}
              back to drawing.
            </p>
          </div>
        </div>
      )}

      <div className="sr-only" role="status" aria-live="polite">
        {announcement}
      </div>
    </div>
  );
}

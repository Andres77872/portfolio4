import { Component, Suspense, lazy, useEffect, useId, useRef, useState } from 'react';
import type { ComponentType, ErrorInfo, KeyboardEvent, ReactNode } from 'react';
import { BrainCircuit, Grid3x3, Network, SquareTerminal } from 'lucide-react';
import { useSearchParam, writeSearchParams } from '@/hooks/useSearchParam';
import { cn } from '@/lib/utils';
import Section from './common/Section';
import { TechChip } from './Projects/ProjectMeta';

type GameComponent = ComponentType<{ className?: string }>;

interface Experiment {
  id: string;
  name: string;
  /** Short line shown on every tab. */
  tagline: string;
  /** Longer description shown for the selected experiment. */
  summary: string;
  hint: string;
  stack: string[];
  icon: ComponentType<{ className?: string }>;
  component: GameComponent;
}

/** Query param holding the selected experiment, e.g. `?experiment=game-of-life#playground`. */
const EXPERIMENT_PARAM = 'experiment';

const experiments: Experiment[] = [
  {
    id: 'perceptron',
    name: 'Perceptron on MNIST',
    tagline: 'A neural network learning to read, live',
    summary:
      'Ten artificial neurons learn to recognise handwritten digits from real MNIST data, right in your browser. Watch the weights turn into digit templates, then draw your own.',
    hint: 'Press Load MNIST & train, then open the Draw tab.',
    stack: ['Machine learning', 'MNIST', 'TypeScript'],
    icon: BrainCircuit,
    component: lazy(() => import('@/games/perceptron/Perceptron')) as GameComponent,
  },
  {
    id: 'game-of-life',
    name: 'Game of Life',
    tagline: 'Conway’s cellular automaton sandbox',
    summary:
      'Conway’s Game of Life on a wrap-around grid. Draw cells, stamp gliders, oscillators and guns, or switch to other life-like rules.',
    hint: 'Click or drag on the grid to draw. Space pauses.',
    stack: ['Cellular automata', 'Canvas 2D'],
    icon: Grid3x3,
    component: lazy(() => import('@/games/game-of-life/GameOfLife')) as GameComponent,
  },
  {
    id: 'neural-nexus',
    name: 'Neural Nexus',
    tagline: 'A physics toy on a living network graph',
    summary: 'A physics toy built on a living neural-network graph. Herd nodes into the green ring and chain combos.',
    hint: 'Move your cursor over the canvas to start.',
    stack: ['Canvas 2D', 'Physics', 'TypeScript'],
    icon: Network,
    component: lazy(() => import('@/games/neural-nexus/NeuralNexus')) as GameComponent,
  },
  {
    id: 'matrix-rpg',
    name: 'Matrix RPG',
    tagline: 'A CRT terminal mystery with an AI NPC',
    summary:
      'A CRT terminal mystery. Explore a virtual filesystem, recover memory fragments and talk to an LLM-driven entity.',
    hint: 'Click the terminal and type help.',
    stack: ['Canvas 2D', 'LLM', 'Streaming'],
    icon: SquareTerminal,
    component: lazy(() => import('@/games/matrix-rpg/MatrixRPG')) as GameComponent,
  },
];

class GameErrorBoundary extends Component<{ resetKey: string; children: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Game module failed to load:', error, errorInfo);
  }

  componentDidUpdate(previousProps: { resetKey: string }) {
    if (previousProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div role="alert" className="flex h-full items-center justify-center rounded-xl border border-border bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          This experiment failed to load. Pick another one and try again.
        </div>
      );
    }
    return this.props.children;
  }
}

function GamePlaceholder({ label }: { label: string }) {
  return (
    <div role="status" className="flex h-full items-center justify-center rounded-xl border border-border bg-card/60 text-sm text-muted-foreground">
      {label}
    </div>
  );
}

/** True once the element comes within `rootMargin` of the viewport; stays true afterwards. */
function useNearViewport<T extends Element>(rootMargin = '300px') {
  const ref = useRef<T>(null);
  const [isNear, setIsNear] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || isNear) return;
    if (typeof IntersectionObserver === 'undefined') {
      setIsNear(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          setIsNear(true);
          observer.disconnect();
        }
      },
      { rootMargin },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [isNear, rootMargin]);

  return [ref, isNear] as const;
}

function ExperimentDetails({ experiment, className }: { experiment: Experiment; className?: string }) {
  return (
    <div className={cn('flex flex-col gap-3', className)}>
      <p className="text-sm leading-relaxed text-muted-foreground">{experiment.summary}</p>
      <span className="flex flex-wrap items-center gap-1.5">
        {experiment.stack.map((item) => (
          <TechChip key={item} name={item} />
        ))}
      </span>
      <span className="text-xs font-medium text-primary">{experiment.hint}</span>
    </div>
  );
}

export default function Playground() {
  const requested = useSearchParam(EXPERIMENT_PARAM);
  const activeIndex = Math.max(0, experiments.findIndex((experiment) => experiment.id === requested));
  const [panelRef, isNear] = useNearViewport<HTMLDivElement>();
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const baseId = useId();
  const active = experiments[activeIndex];
  const ActiveGame = active.component;

  const select = (index: number) => {
    const experiment = experiments[index];
    // The first experiment is the default, so it keeps the URL clean.
    writeSearchParams({ [EXPERIMENT_PARAM]: index === 0 ? null : experiment.id });
  };

  const selectAndFocus = (index: number) => {
    const next = (index + experiments.length) % experiments.length;
    select(next);
    tabRefs.current[next]?.focus();
  };

  const handleTabKeyDown = (event: KeyboardEvent<HTMLButtonElement>) => {
    const moves: Record<string, number> = { ArrowDown: 1, ArrowRight: 1, ArrowUp: -1, ArrowLeft: -1 };
    if (event.key in moves) {
      event.preventDefault();
      selectAndFocus(activeIndex + moves[event.key]);
    } else if (event.key === 'Home') {
      event.preventDefault();
      selectAndFocus(0);
    } else if (event.key === 'End') {
      event.preventDefault();
      selectAndFocus(experiments.length - 1);
    }
  };

  return (
    <Section
      id="playground"
      eyebrow="02 — Playground"
      title="Experiments running on this page"
      description="Four small projects built into this portfolio, all running in your browser: a perceptron that learns from real MNIST digits, Conway’s Game of Life, a physics toy and a terminal mystery whose dialogue streams from an LLM."
    >
      <div className="grid items-start gap-8 lg:grid-cols-[minmax(0,1fr)_576px] max-lg:gap-5">
        <div className="flex flex-col gap-4">
          <div
            role="tablist"
            aria-label="Experiments"
            aria-orientation="vertical"
            className="flex flex-col gap-3 max-lg:grid max-lg:grid-cols-2 max-lg:gap-2"
          >
            {experiments.map((experiment, index) => {
              const isActive = index === activeIndex;
              const Icon = experiment.icon;
              return (
                <button
                  key={experiment.id}
                  ref={(element) => {
                    tabRefs.current[index] = element;
                  }}
                  id={`${baseId}-tab-${experiment.id}`}
                  type="button"
                  role="tab"
                  aria-selected={isActive}
                  aria-controls={`${baseId}-panel`}
                  aria-labelledby={`${baseId}-name-${experiment.id}`}
                  aria-describedby={`${baseId}-tagline-${experiment.id}`}
                  tabIndex={isActive ? 0 : -1}
                  onClick={() => select(index)}
                  onKeyDown={handleTabKeyDown}
                  className={cn(
                    'flex min-w-0 flex-col gap-4 rounded-xl border px-4 py-3.5 text-left transition-colors duration-150 max-lg:p-3',
                    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                    isActive
                      ? 'border-primary/45 bg-primary/[0.06]'
                      : 'border-border bg-card/50 hover:border-foreground/20 hover:bg-card',
                  )}
                >
                  <span className="flex min-w-0 items-center gap-3 max-lg:gap-2.5">
                    <span
                      className={cn(
                        'flex size-9 shrink-0 items-center justify-center rounded-lg max-lg:size-8',
                        isActive ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground',
                      )}
                    >
                      <Icon className="size-4.5 max-lg:size-4" />
                    </span>
                    <span className="min-w-0">
                      <span
                        id={`${baseId}-name-${experiment.id}`}
                        className="block truncate text-base font-semibold text-foreground max-lg:line-clamp-2 max-lg:text-sm max-lg:leading-tight max-lg:whitespace-normal"
                      >
                        {experiment.name}
                      </span>
                      <span id={`${baseId}-tagline-${experiment.id}`} className="block truncate text-xs text-muted-foreground max-lg:hidden">
                        {experiment.tagline}
                      </span>
                    </span>
                  </span>
                  {isActive && <ExperimentDetails experiment={experiment} className="max-lg:hidden" />}
                </button>
              );
            })}
          </div>

          {/* Below lg the tabs are a compact grid, so the details sit underneath it. */}
          <ExperimentDetails experiment={active} className="lg:hidden" />
        </div>

        <div
          ref={panelRef}
          id={`${baseId}-panel`}
          role="tabpanel"
          aria-labelledby={`${baseId}-tab-${active.id}`}
          className="relative mx-auto h-[450px] w-[576px] max-md:h-[600px] max-md:w-full max-md:max-w-[576px]"
        >
          {isNear ? (
            <GameErrorBoundary resetKey={active.id}>
              <Suspense fallback={<GamePlaceholder label={`Loading ${active.name}…`} />}>
                <ActiveGame className="rounded-lg" />
              </Suspense>
            </GameErrorBoundary>
          ) : (
            <GamePlaceholder label={`${active.name} loads when you scroll here`} />
          )}
        </div>
      </div>
    </Section>
  );
}

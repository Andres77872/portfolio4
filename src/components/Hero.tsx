import { Component, Suspense, lazy, useEffect, useState } from 'react';
import type { ComponentType, ErrorInfo, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { GameSelector, GameInfo } from '@/components/games';

const NeuralNexus = lazy(() => import('@/games/neural-nexus/NeuralNexus'));
const MatrixRPG = lazy(() => import('@/games/matrix-rpg/MatrixRPG'));

interface GameErrorBoundaryProps {
  resetKey: number;
  children: ReactNode;
}

interface GameErrorBoundaryState {
  hasError: boolean;
}

class GameErrorBoundary extends Component<GameErrorBoundaryProps, GameErrorBoundaryState> {
  state: GameErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): GameErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Game module failed to load:', error, errorInfo);
  }

  componentDidUpdate(previousProps: GameErrorBoundaryProps) {
    if (previousProps.resetKey !== this.props.resetKey && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div role="alert" className="flex h-full items-center justify-center rounded-lg border border-border/60 bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          Game failed to load. Switch games and try again.
        </div>
      );
    }

    return this.props.children;
  }
}

const roles = [
  'AI Developer',
  'LLM Engineer',
  'Machine Learning Engineer',
  'Full Stack Developer',
];

const games: GameInfo[] = [
  {
    id: 'neural-nexus',
    name: 'Neural Nexus',
    component: NeuralNexus as ComponentType<{ className?: string; width?: number; height?: number }>,
    description: 'Interactive neural network visualization',
  },
  {
    id: 'matrix-rpg',
    name: 'Matrix RPG',
    component: MatrixRPG as ComponentType<{ className?: string; width?: number; height?: number }>,
    description: 'Terminal-based AI adventure',
  },
];

export default function Hero() {
  const [currentRoleIndex, setCurrentRoleIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [currentGameIndex, setCurrentGameIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setIsAnimating(true);
      setTimeout(() => {
        setCurrentRoleIndex((prev) => (prev + 1) % roles.length);
        setIsAnimating(false);
      }, 300);
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const headerHeight = parseInt(getComputedStyle(document.documentElement).getPropertyValue('--header-height') || '0');
      const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
      const offsetPosition = elementPosition - headerHeight;

      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth'
      });
    }
  };

  const SelectedGame = games[currentGameIndex].component;

  return (
    <section className={cn(
      "min-h-screen flex flex-col justify-center items-center relative overflow-hidden",
      "py-12 px-6",
      "max-md:py-8 max-md:px-4 max-md:min-h-[92vh]",
      "max-xs:py-6 max-xs:px-3",
    )}>
      {/* Two-column grid */}
      <div className={cn(
        "grid grid-cols-2 gap-12 items-center w-full relative z-[2]",
        "max-w-[1200px]",
        "max-md:grid-cols-1 max-md:gap-8 max-md:text-center",
      )}>
        {/* Text Block */}
        <div className={cn(
          "flex flex-col gap-4",
          "max-md:order-2 max-md:items-center",
        )}>
          {/* Greeting */}
          <div
            className={cn(
              "inline-flex items-center gap-2 text-base font-medium text-muted-foreground tracking-wide",
              "animate-slide-in-left",
              "max-md:justify-center",
            )}
            style={{ animationDelay: '0.15s' }}
          >
            <span className="inline-block animate-wave origin-[70%_70%]">👋</span>
            Hi, I'm Andres
          </div>

          {/* Title */}
          <h1 className="m-0 leading-[1.08] tracking-tight">
            <span
              className={cn(
                "block font-sans font-bold text-foreground mb-0.5",
                "text-[clamp(2.25rem,4.5vw,3.75rem)]",
                "animate-slide-in-left",
                "max-xs:text-[1.85rem]",
              )}
              style={{ animationDelay: '0.3s' }}
            >
              Building the Future with
            </span>
            <span
              className={cn(
                "block font-sans font-extrabold tracking-tighter",
                "text-[clamp(2.5rem,5vw,4.25rem)]",
                "bg-linear-to-br from-indigo-400 via-indigo-300 to-indigo-400",
                "bg-[length:200%_200%] bg-clip-text text-transparent",
                "animate-slide-in-left animate-gradient-shift",
                "max-xs:text-[2rem]",
              )}
              style={{
                animationDelay: '0.45s',
                WebkitBackgroundClip: 'text',
                animation: 'slideInFromLeft 0.6s cubic-bezier(0,0,0.2,1) 0.45s both, gradientShift 6s ease-in-out infinite',
              }}
            >
              Artificial Intelligence
            </span>
          </h1>

          {/* Role Switcher */}
          <div
            className={cn(
              "flex items-center gap-2 text-lg font-medium min-h-9",
              "animate-slide-in-left",
              "max-md:justify-center",
              "max-xs:text-base",
            )}
            style={{ animationDelay: '0.6s' }}
          >
            <span className="text-muted-foreground">I'm a </span>
            <span
              className={cn(
                "bg-linear-to-br from-indigo-400 to-indigo-300 bg-clip-text text-transparent font-semibold",
                "transition-all duration-250 ease-out",
                isAnimating && "opacity-0 translate-y-2",
              )}
              style={{ WebkitBackgroundClip: 'text' }}
              key={currentRoleIndex}
            >
              {roles[currentRoleIndex]}
            </span>
          </div>

          {/* Description */}
          <p
            className={cn(
              "text-base leading-relaxed text-muted-foreground max-w-[480px]",
              "animate-slide-in-left",
              "max-md:max-w-[420px]",
              "max-xs:text-sm",
            )}
            style={{ animationDelay: '0.75s' }}
          >
            Specializing in Generative AI, Large Language Models, and autonomous agent systems.
            I transform cutting-edge research into production-ready AI solutions.
          </p>

          {/* CTA Buttons */}
          <div
            className={cn(
              "flex gap-3 mt-3",
              "animate-slide-in-left",
              "max-md:flex-col max-md:items-center",
            )}
            style={{ animationDelay: '0.9s' }}
          >
            <Button
              onClick={() => scrollToSection('projects')}
              className={cn(
                "bg-indigo-500 text-primary-foreground border border-indigo-500",
                "shadow-[0_1px_2px_hsl(0_0%_0%/0.05)]",
                "hover:bg-indigo-600 hover:border-indigo-600",
                "hover:-translate-y-px hover:shadow-[0_4px_12px_hsl(239_84%_67%/0.2)]",
                "active:translate-y-0 active:shadow-[0_1px_2px_hsl(0_0%_0%/0.05)]",
                "transition-all duration-200",
                "max-md:w-full max-md:max-w-60 max-md:justify-center",
              )}
              size="lg"
            >
              View My Work
              <span className="text-[0.875em] transition-transform duration-200 group-hover:translate-x-0.5">→</span>
            </Button>
            <Button
              variant="ghost"
              onClick={() => scrollToSection('contact')}
              className={cn(
                "bg-foreground/[0.04] text-foreground",
                "border border-foreground/[0.08]",
                "backdrop-blur-sm",
                "hover:bg-foreground/[0.08] hover:border-foreground/[0.12]",
                "hover:-translate-y-px hover:shadow-[0_4px_12px_hsl(0_0%_0%/0.15)]",
                "active:translate-y-0",
                "transition-all duration-200",
                "max-md:w-full max-md:max-w-60 max-md:justify-center",
              )}
              size="lg"
            >
              Let's Connect
            </Button>
          </div>
        </div>

        {/* Visual / Game Canvas - Fixed size container to prevent layout shift */}
        <div
          className={cn(
            'flex justify-center items-center relative',
            'max-md:order-1',
          )}
        >
          {/* Game wrapper with fixed dimensions */}
          <div
            className={cn(
              'relative',
              'w-[576px] h-[450px]',
              'max-md:w-[420px] max-md:h-[340px]',
              'max-xs:w-[320px] max-xs:h-[260px]',
            )}
          >
            {/* Render current game */}
            <GameErrorBoundary resetKey={currentGameIndex}>
              <Suspense fallback={(
                <div role="status" className="flex h-full items-center justify-center rounded-lg border border-border/60 bg-muted/30 text-sm text-muted-foreground">
                  Loading game...
                </div>
              )}>
                <SelectedGame className="rounded-lg" />
              </Suspense>
            </GameErrorBoundary>

            {/* Game selector */}
            <GameSelector
              games={games}
              currentGameIndex={currentGameIndex}
              onGameChange={setCurrentGameIndex}
            />
          </div>
        </div>
      </div>

      {/* Scroll Indicator */}
      <div
        className={cn(
          "absolute bottom-6 left-1/2 -translate-x-1/2",
          "animate-slide-in-bottom",
        )}
        style={{ animationDelay: '1.1s' }}
      >
        <div
          className={cn(
            "flex flex-col items-center gap-1.5",
            "text-muted-foreground cursor-pointer",
            "transition-all duration-200",
            "hover:text-indigo-400 hover:-translate-y-0.5",
          )}
          onClick={() => scrollToSection('about')}
        >
          <span className="text-xs font-medium tracking-wide">Scroll to explore</span>
          <div className="text-base animate-bounce-arrow">↓</div>
        </div>
      </div>
    </section>
  );
}

import { useEffect, useRef, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import Navbar from './Navbar';
import { ThemeToggle } from '@/components/theme-toggle';
import { useModal } from '../contexts/ModalContext';
import { Button } from '@/components/ui/button';

// GitHub icon component (not available in lucide-react)
function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
    </svg>
  );
}

const SCROLL_THRESHOLD = 60;

export default function Header() {
  const headerRef = useRef<HTMLElement>(null);
  const [isScrolled, setIsScrolled] = useState(false);
  const { isModalOpen } = useModal();

  // Update CSS variable with header height
  const updateHeaderHeight = useCallback(() => {
    if (headerRef.current) {
      const height = headerRef.current.offsetHeight;
      document.documentElement.style.setProperty('--header-height', `${height}px`);
    }
  }, []);

  useEffect(() => {
    updateHeaderHeight();
    window.addEventListener('resize', updateHeaderHeight);
    
    return () => window.removeEventListener('resize', updateHeaderHeight);
  }, [updateHeaderHeight]);

  // Handle scroll effect with throttle-like behavior
  const handleScroll = useCallback(() => {
    const scrolled = window.scrollY > SCROLL_THRESHOLD;
    if (scrolled !== isScrolled) {
      setIsScrolled(scrolled);
      // Update height after state change
      setTimeout(updateHeaderHeight, 350); // After transition
    }
  }, [isScrolled, updateHeaderHeight]);

  useEffect(() => {
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, [handleScroll]);

  // Scroll to top handler
  const handleLogoClick = useCallback((e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  // Hide header when modal is open
  if (isModalOpen) return null;

  return (
    <header 
      ref={headerRef}
      className={cn(
        "fixed top-4 left-1/2 z-[100]",
        "bg-background/80 backdrop-blur-xl",
        "border border-border/50 rounded-xl",
        "shadow-sm shadow-black/5",
        "transition-all duration-300 ease-out",
        "animate-header-slide-in",
        // Responsive widths
        "max-md:w-[calc(100%-1rem)] max-md:top-2",
        "max-lg:w-[calc(100%-1.5rem)] max-lg:top-3",
        "max-xs:w-[calc(100%-0.75rem)]",
        // Scrolled state - more prominent
        isScrolled && [
          "top-3 max-md:top-1.5",
          "bg-background/90 backdrop-blur-2xl",
          "border-border/70",
          "shadow-md shadow-black/10",
        ],
        // Accessibility
        "motion-reduce:animate-none",
        "contrast-more:border-2 contrast-more:border-foreground contrast-more:bg-background",
      )}
      role="banner"
    >
      <div className="grid grid-cols-[auto_1fr_auto] items-stretch h-14 max-md:h-[52px] max-xs:h-12">
        {/* Logo Section */}
        <div className="flex items-stretch">
          <a
            href="#top"
            onClick={handleLogoClick}
            className={cn(
              "flex items-center gap-2 px-4 no-underline text-foreground",
              "border-r border-border/50",
              "transition-colors duration-200",
              "hover:bg-accent/50",
              "focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2",
              "max-md:px-3 max-xs:px-2.5",
              "contrast-more:text-foreground contrast-more:border-r-2",
            )}
            aria-label="Scroll to top"
          >
            <div className="flex flex-col gap-0.5">
              <div className={cn(
                "flex items-baseline font-sans text-lg font-semibold leading-none tracking-tight",
                "max-md:text-base max-xs:text-sm",
              )}>
                <span className="text-foreground contrast-more:text-foreground">arizmendi</span>
                <span className="text-primary font-bold contrast-more:text-primary">.io</span>
              </div>
              <span className="text-[0.6rem] font-medium text-muted-foreground uppercase tracking-[0.15em] max-md:hidden">
                AI Developer
              </span>
            </div>
          </a>
        </div>

        {/* Navigation */}
        <Navbar />

        {/* Actions */}
        <div className="flex items-stretch">
          <div className={cn(
            "flex items-center justify-center",
            "border-l border-border/50",
            "contrast-more:border-l-2",
          )}>
            <ThemeToggle />
          </div>
          <Button
            variant="ghost"
            asChild
            className={cn(
              "flex items-center gap-2 px-4 h-auto rounded-none rounded-r-xl",
              "text-muted-foreground",
              "border-l border-border/50",
              "transition-colors duration-200",
              "hover:text-foreground hover:bg-accent/50",
              "focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2",
              "max-md:px-3 max-xs:px-2.5",
              "contrast-more:border-l-2 contrast-more:border-foreground",
            )}
          >
            <a 
              href="https://github.com/Andres77872"
              target="_blank" 
              rel="noopener noreferrer"
              aria-label="View GitHub profile (opens in new tab)"
            >
              <GitHubIcon className="size-4.5 max-xs:size-4" />
              <span className="font-medium tracking-[0.05em] uppercase text-xs max-md:hidden">GitHub</span>
            </a>
          </Button>
        </div>
      </div>
    </header>
  );
}

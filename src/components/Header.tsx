import { useEffect, useRef, useState, useCallback } from 'react';
import { cn } from '@/lib/utils';
import Navbar from './Navbar';
import { ThemeToggle } from '@/components/theme-toggle';
import { useModal } from '../contexts/ModalContext';
import { Button } from '@/components/ui/button';
import { GitHubIcon } from '@/components/icons';

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
        "fixed top-4 left-1/2 -translate-x-1/2 z-[100]",
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

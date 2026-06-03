import { useState, useEffect, useCallback, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Menu } from 'lucide-react';

const NAV_ITEMS = [
  { href: '#about', label: 'About' },
  { href: '#projects', label: 'Projects' },
  { href: '#contact', label: 'Contact' },
] as const;

const INTERSECTION_THRESHOLD = 0.3;
const HEADER_OFFSET = 100;

export default function Navbar() {
  const [activeSection, setActiveSection] = useState('');
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);

  // Use IntersectionObserver for better performance and accuracy
  useEffect(() => {
    const sections = NAV_ITEMS.map(item => document.getElementById(item.href.replace('#', '')));
    
    observerRef.current = new IntersectionObserver(
      (entries) => {
        // Find the section that's most visible
        const visibleEntries = entries.filter(entry => entry.isIntersecting);
        if (visibleEntries.length > 0) {
          // Sort by intersection ratio and pick the most visible one
          const mostVisible = visibleEntries.sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
          setActiveSection(mostVisible.target.id);
        }
      },
      {
        rootMargin: `-${HEADER_OFFSET}px 0px -50% 0px`,
        threshold: [INTERSECTION_THRESHOLD],
      }
    );

    sections.forEach(section => {
      if (section) observerRef.current?.observe(section);
    });

    return () => observerRef.current?.disconnect();
  }, []);

  // Close menu on navigation
  const handleNavClick = useCallback(() => {
    setIsMenuOpen(false);
  }, []);

  return (
    <nav className="relative z-[110] mx-auto h-full" aria-label="Main navigation">
      <div className="flex items-center justify-center h-full">
        {/* Desktop Navigation */}
        <ul className="hidden md:flex list-none gap-0.5 m-0 p-1 items-center">
          {NAV_ITEMS.map(({ href, label }) => {
            const sectionId = href.replace('#', '');
            const isActive = activeSection === sectionId;
            return (
              <li key={href} className="relative">
                <a
                  className={cn(
                    "flex font-sans text-sm font-medium no-underline",
                    "py-2 px-3.5 rounded-lg",
                    "transition-colors duration-200",
                    "text-muted-foreground",
                    "hover:text-foreground hover:bg-accent/50",
                    "focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2",
                    "motion-reduce:transition-none",
                    "contrast-more:border contrast-more:border-current",
                    isActive && [
                      "text-primary",
                      "bg-primary/10",
                      "contrast-more:bg-primary contrast-more:text-primary-foreground",
                    ],
                  )}
                  href={href}
                  aria-current={isActive ? 'page' : undefined}
                >
                  {label}
                </a>
              </li>
            );
          })}
        </ul>

        {/* Mobile Menu */}
        <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
          <SheetTrigger asChild className="md:hidden">
            <Button
              variant="ghost"
              size="icon-sm"
              aria-label="Open navigation menu"
              className="text-muted-foreground hover:text-foreground"
            >
              <Menu className="size-5" />
            </Button>
          </SheetTrigger>
          <SheetContent
            side="right"
            className={cn(
              "w-[280px] max-w-[85vw]",
              "bg-background/95 backdrop-blur-xl",
              "border-l border-border/50",
            )}
          >
            <SheetHeader className="pb-4">
              <SheetTitle className="text-left text-lg font-semibold">Navigation</SheetTitle>
            </SheetHeader>
            <nav className="flex flex-col gap-1.5" id="navbar-menu">
              {NAV_ITEMS.map(({ href, label }) => {
                const sectionId = href.replace('#', '');
                const isActive = activeSection === sectionId;
                return (
                  <a
                    key={href}
                    className={cn(
                      "flex font-sans text-sm font-medium no-underline",
                      "w-full py-3 px-4 rounded-lg",
                      "transition-colors duration-200",
                      "text-muted-foreground",
                      "hover:text-foreground hover:bg-accent/50",
                      "focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2",
                      "motion-reduce:transition-none",
                      "contrast-more:border contrast-more:border-current",
                      isActive && [
                        "text-primary",
                        "bg-primary/10",
                        "contrast-more:bg-primary contrast-more:text-primary-foreground",
                      ],
                    )}
                    href={href}
                    onClick={handleNavClick}
                    aria-current={isActive ? 'page' : undefined}
                  >
                    {label}
                  </a>
                );
              })}
            </nav>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}

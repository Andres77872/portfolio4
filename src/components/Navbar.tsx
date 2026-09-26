import { useEffect, useState } from 'react';
import { Menu } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';

const NAV_ITEMS = [
  { id: 'projects', label: 'Work' },
  { id: 'playground', label: 'Playground' },
  { id: 'about', label: 'About' },
] as const;

type SectionId = (typeof NAV_ITEMS)[number]['id'];

/** Tracks which nav section currently crosses the upper third of the viewport. */
function useActiveSection(): SectionId | null {
  const [active, setActive] = useState<SectionId | null>(null);

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;

    const crossing = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) crossing.add(entry.target.id);
          else crossing.delete(entry.target.id);
        }
        // Null while the intro (or a gap between sections) is under the band.
        setActive(NAV_ITEMS.find(({ id }) => crossing.has(id))?.id ?? null);
      },
      // A thin band a third of the way down: at most one section crosses it at a time.
      { rootMargin: '-33% 0px -66% 0px' },
    );

    for (const { id } of NAV_ITEMS) {
      const section = document.getElementById(id);
      if (section) observer.observe(section);
    }
    return () => observer.disconnect();
  }, []);

  return active;
}

export default function Navbar() {
  const active = useActiveSection();
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const linkClasses = (isActive: boolean) =>
    cn(
      'rounded-full text-sm font-medium no-underline transition-colors duration-150',
      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
      'motion-reduce:transition-none',
      isActive ? 'text-foreground' : 'text-muted-foreground hover:text-foreground',
    );

  return (
    <nav aria-label="Main navigation">
      <ul className="flex items-center gap-1 max-md:hidden">
        {NAV_ITEMS.map(({ id, label }) => {
          const isActive = active === id;
          return (
            <li key={id}>
              <a
                href={`#${id}`}
                aria-current={isActive ? 'location' : undefined}
                className={cn(linkClasses(isActive), 'relative px-3 py-1.5', isActive && 'bg-accent/70')}
              >
                {label}
              </a>
            </li>
          );
        })}
      </ul>

      <Sheet open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon-sm" aria-label="Open navigation menu" className="text-muted-foreground hover:text-foreground md:hidden">
            <Menu className="size-5" />
          </Button>
        </SheetTrigger>
        {/* z-[160]: above the fixed Header (z-100) and the chat sheet (z-150), below project modals (z-200). */}
        <SheetContent
          side="right"
          overlayClassName="z-[160]"
          className="z-[160] w-[280px] max-w-[85vw] border-l border-border/60 bg-background/95 backdrop-blur-xl"
        >
          <SheetHeader>
            <SheetTitle className="text-left text-lg font-semibold">Navigate</SheetTitle>
            <SheetDescription className="sr-only">Jump to a section of the page</SheetDescription>
          </SheetHeader>
          <ul className="flex flex-col gap-1 px-4">
            {NAV_ITEMS.map(({ id, label }) => {
              const isActive = active === id;
              return (
                <li key={id}>
                  <a
                    href={`#${id}`}
                    onClick={() => setIsMenuOpen(false)}
                    aria-current={isActive ? 'location' : undefined}
                    className={cn(linkClasses(isActive), 'flex rounded-lg px-4 py-3', isActive && 'bg-accent/70')}
                  >
                    {label}
                  </a>
                </li>
              );
            })}
          </ul>
        </SheetContent>
      </Sheet>
    </nav>
  );
}

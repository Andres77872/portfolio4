import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import Navbar from './Navbar';
import { ThemeToggle } from '@/components/theme-toggle';
import { Button } from '@/components/ui/button';
import { GitHubIcon } from '@/components/icons';
import { getContactLink, profile } from '@/data/profile';

const SCROLL_THRESHOLD = 24;

export default function Header() {
  const [isScrolled, setIsScrolled] = useState(false);
  const github = getContactLink('GitHub');

  useEffect(() => {
    const update = () => setIsScrolled(window.scrollY > SCROLL_THRESHOLD);
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, []);

  return (
    <header
      className={cn(
        'fixed inset-x-0 top-0 z-[100] transition-[background-color,border-color,box-shadow] duration-300',
        'border-b border-transparent',
        isScrolled && 'border-border/70 bg-background/80 shadow-sm shadow-black/5 backdrop-blur-xl',
        'contrast-more:border-foreground contrast-more:bg-background',
      )}
    >
      <div className="mx-auto flex h-16 max-w-[1200px] items-center justify-between gap-4 px-6 max-md:h-14 max-md:px-4">
        <a
          href="#top"
          className={cn(
            'group flex items-baseline gap-2 rounded-md text-foreground no-underline',
            'focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-ring',
          )}
          aria-label={`${profile.name} — back to top`}
        >
          <span className="text-base font-semibold tracking-tight">
            arizmendi<span className="text-primary">.io</span>
          </span>
          <span className="font-mono text-[0.625rem] uppercase tracking-[0.18em] text-muted-foreground max-md:hidden">
            {profile.title}
          </span>
        </a>

        <div className="flex items-center gap-1">
          <Navbar />
          <span aria-hidden="true" className="mx-2 h-5 w-px bg-border max-md:hidden" />
          <ThemeToggle />
          {github && (
            <Button variant="ghost" size="icon" asChild className="size-8 rounded-full text-muted-foreground hover:text-foreground">
              <a href={github.url} target="_blank" rel="noopener noreferrer" aria-label="GitHub profile (opens in new tab)">
                <GitHubIcon className="size-4" />
              </a>
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}

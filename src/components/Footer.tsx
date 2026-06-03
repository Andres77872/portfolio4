import { useEffect, useRef } from 'react';
import { cn } from '@/lib/utils';
import { Separator } from '@/components/ui/separator';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const footerRef = useRef<HTMLElement>(null);

  // Update CSS variable with footer height
  useEffect(() => {
    const updateFooterHeight = () => {
      if (footerRef.current) {
        const height = footerRef.current.offsetHeight;
        document.documentElement.style.setProperty('--footer-height', `${height}px`);
      }
    };

    updateFooterHeight();
    window.addEventListener('resize', updateFooterHeight);

    return () => {
      window.removeEventListener('resize', updateFooterHeight);
    };
  }, []);

  return (
    <footer
      className={cn(
        "bg-card border-t border-border relative",
        "pt-8 pb-3",
        "animate-card-fade-in",
        "motion-reduce:animate-none",
        "contrast-more:border-t-2 contrast-more:border-foreground",
        "max-md:pt-6",
      )}
      ref={footerRef}
    >
      {/* Top gradient line */}
      <div
        className={cn(
          "absolute top-0 left-0 w-full h-px opacity-50",
          "bg-gradient-to-r from-transparent via-foreground/[0.06] to-transparent",
          "contrast-more:hidden",
        )}
        aria-hidden="true"
      />

      <div className="max-w-[1200px] mx-auto px-4 max-lg:px-[clamp(1rem,4vw,2rem)] max-md:px-4">
        {/* Main content grid */}
        <div className={cn(
          "grid grid-cols-2 gap-8 mb-4 pb-4",
          "max-md:grid-cols-1 max-md:gap-4 max-md:text-center",
        )}>
          {/* Brand */}
          <div className={cn("flex flex-col gap-1.5", "max-md:items-center")}>
            <div className="flex flex-col gap-0.5">
              <div className="flex items-baseline font-sans text-xl font-bold leading-tight -tracking-[0.025em]">
                <span className="text-foreground font-semibold">arz</span>
                <span
                  className={cn(
                    "font-extrabold bg-clip-text text-transparent",
                    "bg-gradient-to-br from-primary to-indigo-400",
                    "bg-[length:200%_200%] animate-gradient-shift",
                    "motion-reduce:animate-none",
                    "contrast-more:bg-none contrast-more:text-primary",
                    "max-xs:text-lg",
                  )}
                >
                  .ai
                </span>
              </div>
              <p className={cn(
                "text-sm text-muted-foreground m-0 max-w-[300px] leading-relaxed font-sans tracking-normal",
                "max-md:text-center",
                "max-xs:text-xs",
              )}>
                Building the future with Artificial Intelligence
              </p>
            </div>
          </div>

          {/* Links */}
          <div className={cn("grid grid-cols-2 gap-4", "max-md:grid-cols-1 max-md:gap-3")}>
            <div>
              <h4 className="text-sm font-semibold text-foreground mb-1.5 -tracking-[0.01em]">Connect</h4>
              <ul className="list-none p-0 m-0 flex flex-col gap-0.5">
                <li>
                  <a
                    href="mailto:andres@arz.ai"
                    className={cn(
                      "text-muted-foreground no-underline text-sm",
                      "flex items-center py-1",
                      "transition-colors duration-150 ease-linear",
                      "hover:text-foreground",
                      "focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 focus-visible:rounded-sm",
                      "contrast-more:text-foreground contrast-more:underline",
                    )}
                    aria-label="Email contact"
                  >
                    Email
                  </a>
                </li>
                <li>
                  <a
                    href="https://www.linkedin.com/in/arz-ai/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "text-muted-foreground no-underline text-sm",
                      "flex items-center py-1",
                      "transition-colors duration-150 ease-linear",
                      "hover:text-foreground",
                      "focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 focus-visible:rounded-sm",
                      "contrast-more:text-foreground contrast-more:underline",
                    )}
                    aria-label="LinkedIn profile"
                  >
                    LinkedIn
                  </a>
                </li>
                <li>
                  <a
                    href="https://github.com/Andres77872"
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      "text-muted-foreground no-underline text-sm",
                      "flex items-center py-1",
                      "transition-colors duration-150 ease-linear",
                      "hover:text-foreground",
                      "focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 focus-visible:rounded-sm",
                      "contrast-more:text-foreground contrast-more:underline",
                    )}
                    aria-label="GitHub profile"
                  >
                    GitHub
                  </a>
                </li>
              </ul>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-foreground mb-1.5 -tracking-[0.01em]">Portfolio</h4>
              <ul className="list-none p-0 m-0 flex flex-col gap-0.5">
                <li>
                  <a
                    href="#about"
                    className={cn(
                      "text-muted-foreground no-underline text-sm",
                      "flex items-center py-1",
                      "transition-colors duration-150 ease-linear",
                      "hover:text-foreground",
                      "focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 focus-visible:rounded-sm",
                      "contrast-more:text-foreground contrast-more:underline",
                    )}
                    aria-label="About section"
                  >
                    About
                  </a>
                </li>
                <li>
                  <a
                    href="#projects"
                    className={cn(
                      "text-muted-foreground no-underline text-sm",
                      "flex items-center py-1",
                      "transition-colors duration-150 ease-linear",
                      "hover:text-foreground",
                      "focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 focus-visible:rounded-sm",
                      "contrast-more:text-foreground contrast-more:underline",
                    )}
                    aria-label="Projects section"
                  >
                    Projects
                  </a>
                </li>
                <li>
                  <a
                    href="#contact"
                    className={cn(
                      "text-muted-foreground no-underline text-sm",
                      "flex items-center py-1",
                      "transition-colors duration-150 ease-linear",
                      "hover:text-foreground",
                      "focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2 focus-visible:rounded-sm",
                      "contrast-more:text-foreground contrast-more:underline",
                    )}
                    aria-label="Contact section"
                  >
                    Contact
                  </a>
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Divider */}
        <Separator className="bg-border" />

        {/* Bottom bar */}
        <div className={cn(
          "flex justify-between items-center pt-3",
          "max-md:flex-col max-md:gap-3 max-md:text-center",
        )}>
          <p className="m-0 text-sm text-muted-foreground">
            &copy; {currentYear} arz.ai. All rights reserved.
          </p>
          <div
            className={cn(
              "flex items-center gap-0.5",
              "py-1 px-3 rounded-xl",
              "bg-foreground/[0.04] border border-border",
              "transition-colors duration-150 ease-linear",
              "hover:bg-foreground/[0.06]",
              "focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2",
            )}
          >
            <span className="text-sm motion-reduce:animate-none" aria-hidden="true">⚡</span>
            <p className="m-0 text-sm text-muted-foreground">
              Built with React & TypeScript
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}

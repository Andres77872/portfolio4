import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

interface SectionProps {
  id?: string;
  /** Small mono label above the title, e.g. "01 — Work". */
  eyebrow?: string;
  title?: ReactNode;
  description?: ReactNode;
  /** Right-aligned slot in the section header (counts, links). */
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
}

export default function Section({
  id,
  eyebrow,
  title,
  description,
  actions,
  children,
  className,
}: SectionProps) {
  const headingId = id && title ? `${id}-heading` : undefined;

  return (
    <section
      id={id}
      aria-labelledby={headingId}
      className={cn('relative scroll-mt-20 py-20 max-md:py-14', className)}
    >
      <div className="mx-auto max-w-[1200px] px-6 max-md:px-4">
        {(eyebrow || title || description || actions) && (
          <header className="mb-10 flex flex-wrap items-end justify-between gap-x-8 gap-y-4 max-md:mb-8">
            <div className="max-w-2xl">
              {eyebrow && (
                <p className="mb-3 font-mono text-xs font-medium uppercase tracking-[0.2em] text-primary">
                  {eyebrow}
                </p>
              )}
              {title && (
                <h2
                  id={headingId}
                  className="text-balance text-[clamp(1.75rem,3.5vw,2.5rem)] font-semibold leading-tight tracking-tight text-foreground"
                >
                  {title}
                </h2>
              )}
              {description && (
                <div className="mt-3 text-pretty text-base leading-relaxed text-muted-foreground md:text-lg">
                  {description}
                </div>
              )}
            </div>
            {actions && <div className="shrink-0">{actions}</div>}
          </header>
        )}

        {children}
      </div>
    </section>
  );
}

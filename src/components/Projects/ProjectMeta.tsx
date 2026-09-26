import type { ComponentType, MouseEvent } from 'react';
import { ArrowUpRight, Box, BookOpen, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { GitHubIcon } from '@/components/icons';
import { getLanguageColor } from './constants';
import type { CatalogProject } from './types';

/** "Live" when a public URL exists, otherwise "Source" for code-only projects. */
export function ProjectStatusPill({ project, className }: { project: CatalogProject; className?: string }) {
  const isLive = Boolean(project.url);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1',
        'border border-border/60 bg-background/85 backdrop-blur-md',
        'font-mono text-[0.6875rem] font-medium uppercase tracking-wider',
        isLive ? 'text-success' : 'text-muted-foreground',
        className,
      )}
    >
      <span aria-hidden="true" className={cn('size-1.5 rounded-full', isLive ? 'bg-success' : 'bg-muted-foreground')} />
      {isLive ? 'Live' : 'Source'}
    </span>
  );
}

interface TechChipProps {
  name: string;
  /** Pass a boolean to render a toggle (`aria-pressed`); omit for plain actions. */
  selected?: boolean;
  count?: number;
  onClick?: (name: string) => void;
  className?: string;
}

/** Monospace technology chip; interactive only when `onClick` is given. */
export function TechChip({ name, selected, count, onClick, className }: TechChipProps) {
  const classes = cn(
    'inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5',
    'font-mono text-[0.6875rem] font-medium uppercase tracking-wide',
    selected
      ? 'border-primary/40 bg-primary/12 text-primary'
      : 'border-border bg-foreground/[0.03] text-muted-foreground',
    className,
  );

  const label = (
    <>
      {name}
      {count !== undefined && <span className="tabular-nums opacity-60">{count}</span>}
    </>
  );

  if (!onClick) return <span className={classes}>{label}</span>;

  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={() => onClick(name)}
      className={cn(
        classes,
        'cursor-pointer transition-colors duration-150',
        !selected && 'hover:border-primary/35 hover:text-foreground',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
      )}
    >
      {label}
    </button>
  );
}

export function LanguageDots({ languages, className }: { languages?: string[]; className?: string }) {
  if (!languages?.length) return null;

  return (
    <ul className={cn('flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground', className)}>
      {languages.map((language) => (
        <li key={language} className="inline-flex items-center gap-1.5">
          <span
            aria-hidden="true"
            className="size-2 shrink-0 rounded-full ring-1 ring-foreground/15"
            style={{ backgroundColor: getLanguageColor(language) }}
          />
          {language}
        </li>
      ))}
    </ul>
  );
}

const isHuggingFace = (url: string) => url.includes('huggingface.co');

interface ProjectLinksProps {
  project: CatalogProject;
  /** `compact` for card footers, `full` for featured cards and the modal. */
  variant?: 'compact' | 'full';
  className?: string;
}

const stopPropagation = (event: MouseEvent) => event.stopPropagation();

interface LinkSpec {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  primary: boolean;
}

export function ProjectLinks({ project, variant = 'compact', className }: ProjectLinksProps) {
  const links: LinkSpec[] = [];
  if (project.url) links.push({ href: project.url, label: 'Live demo', icon: Globe, primary: true });
  if (project.repoUrl) {
    const onHuggingFace = isHuggingFace(project.repoUrl);
    links.push({
      href: project.repoUrl,
      label: onHuggingFace ? 'Model' : 'Code',
      icon: onHuggingFace ? Box : GitHubIcon,
      primary: false,
    });
  }
  if (project.apiUrl) links.push({ href: project.apiUrl, label: 'API', icon: BookOpen, primary: false });

  if (links.length === 0) return null;

  return (
    <div className={cn('relative z-10 flex flex-wrap items-center gap-2', className)}>
      {links.map(({ href, label, icon: Icon, primary }) => (
        <Button
          key={label}
          asChild
          size="sm"
          variant={variant === 'full' && primary ? 'default' : variant === 'full' ? 'outline' : 'ghost'}
          className={cn(
            variant === 'compact' && '-ml-1 h-7 px-2 text-xs text-muted-foreground hover:text-foreground first:ml-0',
          )}
        >
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            onClick={stopPropagation}
            aria-label={`${label}: ${project.title} (opens in new tab)`}
          >
            <Icon className="size-3.5" />
            {label}
            {variant === 'full' && <ArrowUpRight className="size-3.5 opacity-70" />}
          </a>
        </Button>
      ))}
    </div>
  );
}

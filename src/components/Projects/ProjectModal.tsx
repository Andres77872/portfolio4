import { useEffect, useRef, type KeyboardEvent, type ReactNode } from 'react';
import ReactMarkdown from 'react-markdown';
import { ChevronLeft, ChevronRight, MessageSquareText } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { askAssistant, isAssistantAvailable } from '@/lib/assistant';
import { proseClasses } from '@/lib/prose';
import { focusSection } from '@/lib/scroll';
import { cn } from '@/lib/utils';
import { formatReleaseDate, getCategoryLabel, stripLeadingTitle } from './catalog';
import { LanguageDots, ProjectLinks, TechChip } from './ProjectMeta';
import type { CatalogProject } from './types';

interface ProjectModalProps {
  project: CatalogProject;
  previous: CatalogProject | null;
  next: CatalogProject | null;
  position: { index: number; total: number };
  onClose: () => void;
  onNavigate: (project: CatalogProject) => void;
  selectedTechnologies: readonly string[];
  onTechnologyClick: (technology: string) => void;
}

const markdownClasses = proseClasses('comfortable');

const isRendered = (element: HTMLElement) => element.getClientRects().length > 0;

const describeStatus = (project: CatalogProject) =>
  project.status === 'repo' ? 'Open-source repository' : project.url ? 'Live in production' : 'Production';

const describeAccess = (auth: CatalogProject['auth']) => {
  if (!auth) return null;
  if (!auth.login) return 'Open — no account needed';
  return auth.register ? 'Login and registration' : 'Login (registration closed)';
};

function Fact({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="font-mono text-[0.6875rem] uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="text-sm text-foreground">{children}</dd>
    </div>
  );
}

export default function ProjectModal({
  project,
  previous,
  next,
  position,
  onClose,
  onNavigate,
  selectedTechnologies,
  onTechnologyClick,
}: ProjectModalProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const openerRef = useRef<HTMLElement | null>(null);
  const askSlugRef = useRef<string | null>(null);
  const showingWorkRef = useRef(false);
  const canAsk = isAssistantAvailable();
  const category = getCategoryLabel(project.category);
  const access = describeAccess(project.auth);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0 });
  }, [project.slug]);

  // Runs before Radix moves focus in, so activeElement is still whatever opened the modal
  // (a card, an Intro link, a chat link).
  const captureOpener = (event: Event) => {
    const active = document.activeElement;
    openerRef.current = active instanceof HTMLElement && active !== document.body ? active : null;
    // Start on the scrolling body rather than the first button ("Ask about this project"): screen
    // readers still announce the dialog's title and description, Space/PageDown scroll the
    // write-up (the dialog container itself does not scroll), and Tab reaches the actions next.
    event.preventDefault();
    scrollRef.current?.focus({ preventScroll: true });
  };

  // Radix runs this after the modal unmounts, once hideOthers and the pointer lock are undone.
  const restoreFocus = (event: Event) => {
    // Radix 1.1.15 would focus the missing DialogTrigger, which drops focus to <body>.
    event.preventDefault();
    if (askSlugRef.current) {
      askAssistant({ projectSlug: askSlugRef.current });
      return;
    }
    if (showingWorkRef.current) {
      // The page is scrolling to the filtered Work list; put focus there, unless it is covered (inert).
      focusSection('projects');
      if (document.activeElement !== document.body) return;
    }
    const opener = openerRef.current;
    if (opener?.isConnected && isRendered(opener)) opener.focus({ preventScroll: true });
    else focusSection('projects');
  };

  const askAboutProject = () => {
    askSlugRef.current = project.slug;
    onClose();
  };

  const showProjectsUsing = (technology: string) => {
    showingWorkRef.current = true;
    onTechnologyClick(technology);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) return;
    if (event.key === 'ArrowLeft' && previous) {
      event.preventDefault();
      onNavigate(previous);
    } else if (event.key === 'ArrowRight' && next) {
      event.preventDefault();
      onNavigate(next);
    }
  };

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        onOpenAutoFocus={captureOpener}
        onCloseAutoFocus={restoreFocus}
        onKeyDown={handleKeyDown}
        className={cn(
          'flex h-[min(92dvh,58rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[60rem]',
          'border-border/70 bg-background shadow-2xl',
          'max-xs:h-[100dvh] max-xs:max-w-full max-xs:rounded-none max-xs:border-0',
        )}
      >
        <div ref={scrollRef} tabIndex={-1} className="min-h-0 flex-1 overflow-y-auto overscroll-contain outline-none">
          {project.image && (
            <div className="relative h-64 overflow-hidden bg-muted max-md:h-52">
              <img src={project.image} alt="" className="size-full object-cover object-[center_28%]" />
              <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-t from-background via-background/30 to-transparent" />
            </div>
          )}

          <header className={cn('relative px-8 max-md:px-5', project.image ? '-mt-14' : 'pt-10')}>
            <p className="font-mono text-[0.6875rem] uppercase tracking-wider text-muted-foreground">
              {[category, project.year].filter(Boolean).join(' · ')}
            </p>
            <DialogTitle className="mt-2 text-[clamp(1.75rem,4vw,2.25rem)] font-semibold leading-tight tracking-tight">
              {project.title}
            </DialogTitle>
            <DialogDescription className="mt-2 max-w-2xl text-pretty text-base leading-relaxed">
              {project.tagline ?? project.description}
            </DialogDescription>
            {/* empty:hidden keeps the old spacing for a project with no links while the assistant is off. */}
            <div className="mt-5 flex flex-wrap items-center gap-2 empty:hidden">
              <ProjectLinks project={project} variant="full" />
              {canAsk && (
                <Button type="button" variant="ghost" size="sm" onClick={askAboutProject}>
                  <MessageSquareText />
                  Ask about this project
                </Button>
              )}
            </div>
          </header>

          <div className="grid gap-10 px-8 py-8 max-md:px-5 md:grid-cols-[minmax(0,1fr)_15rem]">
            <div className={markdownClasses}>
              <ReactMarkdown>{stripLeadingTitle(project.descriptionMD, project.title)}</ReactMarkdown>
            </div>

            <aside className="flex flex-col gap-6 border-border md:border-l md:pl-8 max-md:border-t max-md:pt-8">
              <dl className="grid gap-4 max-md:grid-cols-2">
                {project.releaseDate && <Fact label="Released">{formatReleaseDate(project.releaseDate)}</Fact>}
                <Fact label="Status">{describeStatus(project)}</Fact>
                {project.license && <Fact label="License">{project.license}</Fact>}
                {access && <Fact label="Access">{access}</Fact>}
              </dl>

              {project.language && project.language.length > 0 && (
                <div className="flex flex-col gap-2">
                  <h3 className="font-mono text-[0.6875rem] uppercase tracking-wider text-muted-foreground">Languages</h3>
                  <LanguageDots languages={project.language} className="text-sm text-foreground" />
                </div>
              )}

              {project.tags && project.tags.length > 0 && (
                <div className="flex flex-col gap-2">
                  <h3 className="font-mono text-[0.6875rem] uppercase tracking-wider text-muted-foreground">Technologies</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {project.technologies.map((technology) => (
                      <TechChip
                        key={technology}
                        name={technology}
                        selected={selectedTechnologies.includes(technology)}
                        onClick={showProjectsUsing}
                      />
                    ))}
                  </div>
                  <p className="text-xs text-muted-foreground">Select one to see every project that uses it.</p>
                </div>
              )}
            </aside>
          </div>
        </div>

        <footer className="flex items-center justify-between gap-2 border-t border-border bg-background/95 px-3 py-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={!previous}
            onClick={() => previous && onNavigate(previous)}
            className="min-w-0 max-w-[40%] justify-start text-muted-foreground"
            aria-label={previous ? `Previous project: ${previous.title}` : 'No previous project'}
          >
            <ChevronLeft />
            <span className="truncate">{previous?.title ?? 'Previous'}</span>
          </Button>
          <span className="font-mono text-xs tabular-nums text-muted-foreground" aria-hidden="true">
            {position.index + 1} / {position.total}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={!next}
            onClick={() => next && onNavigate(next)}
            className="min-w-0 max-w-[40%] justify-end text-muted-foreground"
            aria-label={next ? `Next project: ${next.title}` : 'No next project'}
          >
            <span className="truncate">{next?.title ?? 'Next'}</span>
            <ChevronRight />
          </Button>
        </footer>
      </DialogContent>
    </Dialog>
  );
}

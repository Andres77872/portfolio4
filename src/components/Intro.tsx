import { ArrowDown, MessageSquareText } from 'lucide-react';
import { askAssistant, isAssistantAvailable } from '@/lib/assistant';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { catalog, getFeaturedProjects, getPortfolioStats } from '@/components/Projects/catalog';
import { getProjectHref, handleProjectLinkClick, openProjectModal } from '@/components/Projects/projectLink';
import { profile } from '@/data/profile';

const stats = getPortfolioStats(catalog);
const spotlight = getFeaturedProjects(catalog).slice(0, 3);

const statItems = [
  { value: stats.total, label: 'Projects shipped' },
  { value: stats.live, label: 'Live demos' },
  { value: stats.openSource, label: 'Open-source repos' },
  { value: stats.firstYear ?? '—', label: 'Shipping since' },
];

export default function Intro() {
  const canAsk = isAssistantAvailable();

  return (
    <section aria-labelledby="intro-heading" className="relative isolate overflow-hidden pt-36 pb-6 max-md:pt-28">
      {/* Faint dot grid, faded toward the edges */}
      <div
        aria-hidden="true"
        className={cn(
          'pointer-events-none absolute inset-0 -z-10 opacity-60',
          'bg-[radial-gradient(var(--border)_1px,transparent_1px)] [background-size:22px_22px]',
          '[mask-image:radial-gradient(ellipse_70%_60%_at_30%_30%,black,transparent)]',
        )}
      />

      <div className="mx-auto max-w-[1200px] px-6 max-md:px-4">
        <p
          className="flex items-center gap-2 font-mono text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground animate-fade-in-up"
        >
          <span aria-hidden="true" className="size-1.5 rounded-full bg-primary" />
          {profile.name} · {profile.title}
        </p>

        <h1
          id="intro-heading"
          className={cn(
            'mt-5 max-w-4xl text-balance font-semibold leading-[1.04] tracking-tight text-foreground',
            'text-[clamp(2.4rem,6vw,4.5rem)]',
            'animate-fade-in-up [animation-delay:80ms]',
          )}
        >
          AI systems, from research <span className="text-muted-foreground">to production.</span>
        </h1>

        <p
          className={cn(
            'mt-6 max-w-2xl text-pretty text-lg leading-relaxed text-muted-foreground max-xs:text-base',
            'animate-fade-in-up [animation-delay:160ms]',
          )}
        >
          Retrieval engines, agent frameworks, fine-tuned models and browser games — designed, built and shipped
          end to end. Start with{' '}
          {spotlight.map((project, index) => (
            <span key={project.slug}>
              <a
                href={getProjectHref(project.slug)}
                onClick={(event) => handleProjectLinkClick(event, () => openProjectModal(project.slug))}
                className="font-medium text-foreground underline decoration-primary/40 decoration-2 underline-offset-4 transition-colors hover:decoration-primary"
              >
                {project.title}
              </a>
              {index < spotlight.length - 2 ? ', ' : index === spotlight.length - 2 ? ' or ' : ''}
            </span>
          ))}
          .
        </p>

        <div className="mt-8 flex flex-wrap items-center gap-3 animate-fade-in-up [animation-delay:240ms]">
          <Button size="lg" asChild className="rounded-full px-6">
            <a href="#projects">
              Browse the work
              <ArrowDown />
            </a>
          </Button>
          <Button size="lg" variant="outline" asChild className="rounded-full bg-card/60 px-6">
            <a href="#about">About me</a>
          </Button>
          {canAsk && (
            <Button
              type="button"
              size="lg"
              variant="ghost"
              className="rounded-full px-5 text-muted-foreground hover:text-foreground"
              onClick={() => askAssistant()}
            >
              <MessageSquareText />
              Ask the assistant
            </Button>
          )}
        </div>

        <dl
          className={cn(
            'mt-14 grid grid-cols-4 gap-6 border-t border-border pt-6 max-md:mt-10 max-md:grid-cols-2',
            'animate-fade-in-up [animation-delay:320ms]',
          )}
        >
          {statItems.map(({ value, label }) => (
            <div key={label} className="flex flex-col-reverse gap-1">
              <dt className="text-sm text-muted-foreground">{label}</dt>
              <dd className="font-mono text-2xl font-medium tabular-nums tracking-tight text-foreground">{value}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

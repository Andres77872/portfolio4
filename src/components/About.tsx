import { useState, type ComponentType } from 'react';
import { ArrowRight, ArrowUpRight, Box, Check, Copy, Mail, MapPin } from 'lucide-react';
import { cn } from '@/lib/utils';
import { GitHubIcon, LinkedInIcon } from '@/components/icons';
import { profile, getContactLink } from '@/data/profile';
import Section from './common/Section';
import {
  PROJECT_CATEGORIES,
  catalog,
  getCategoryCounts,
  getTechnologyUsage,
  sortByNewest,
} from './Projects/catalog';
import { TechChip } from './Projects/ProjectMeta';
import { showWork } from './Projects/projectLink';
import type { ProjectCategoryId } from './Projects/types';

const TOOLBOX_SIZE = 20;
/** One-off technologies say little about a toolbox; show what recurs across projects. */
const TOOLBOX_MIN_PROJECTS = 2;

const categoryCounts = getCategoryCounts(catalog);
const toolbox = getTechnologyUsage(catalog)
  .filter((usage) => usage.count >= TOOLBOX_MIN_PROJECTS)
  .slice(0, TOOLBOX_SIZE);
const projectTitlesByCategory = Object.fromEntries(
  PROJECT_CATEGORIES.map(({ id }) => [
    id,
    sortByNewest(catalog.filter((project) => project.category === id)).map((project) => project.title),
  ]),
) as Record<ProjectCategoryId, string[]>;

const CONTACT_ICONS: Record<string, ComponentType<{ className?: string }>> = {
  Email: Mail,
  GitHub: GitHubIcon,
  LinkedIn: LinkedInIcon,
  'Hugging Face': Box,
};

function CopyEmailButton({ email }: { email: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      window.location.href = `mailto:${email}`;
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={copy}
        aria-label={`Copy ${email}`}
        className={cn(
          'flex size-9 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground',
          'transition-colors hover:border-foreground/25 hover:text-foreground',
          'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
        )}
      >
        {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
      </button>
      <span className="sr-only" role="status">
        {copied ? 'Email address copied' : ''}
      </span>
    </>
  );
}

export default function About() {
  const email = getContactLink('Email');
  const [firstName] = profile.name.split(' ');

  return (
    <Section id="about" eyebrow="03 — About" title={`Hi, I'm ${firstName}.`}>
      <div className="grid gap-12 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] lg:gap-16">
        <div className="flex flex-col gap-12">
          <div className="flex flex-col gap-5 text-pretty text-lg leading-relaxed text-muted-foreground max-xs:text-base">
            {profile.description.map((paragraph, index) => (
              <p key={index} className={cn(index === 0 && 'text-foreground')}>
                {paragraph}
              </p>
            ))}
          </div>

          <div>
            <h3 className="mb-4 font-mono text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">
              What I work on
            </h3>
            <ul className="divide-y divide-border border-y border-border">
              {PROJECT_CATEGORIES.map((category) => (
                <li key={category.id}>
                  <button
                    type="button"
                    onClick={() => showWork({ category: category.id })}
                    className={cn(
                      'group flex w-full items-start justify-between gap-6 py-5 text-left',
                      'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                    )}
                  >
                    <span className="flex flex-col gap-1">
                      <span className="text-base font-semibold text-foreground transition-colors group-hover:text-primary">
                        {category.label}
                      </span>
                      <span className="text-sm text-muted-foreground">{category.description}</span>
                      <span className="mt-1 text-xs text-muted-foreground">
                        {projectTitlesByCategory[category.id].join(' · ')}
                      </span>
                    </span>
                    <span className="flex shrink-0 items-center gap-1.5 pt-0.5 font-mono text-xs text-muted-foreground transition-colors group-hover:text-primary">
                      {categoryCounts[category.id]} projects
                      <ArrowRight className="size-3.5 transition-transform group-hover:translate-x-0.5 motion-reduce:transition-none" />
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>

        <aside className="flex flex-col gap-6">
          <div id="contact" className="scroll-mt-24 rounded-2xl border border-border bg-card p-6 max-xs:p-5">
            <p className="inline-flex items-center gap-2 rounded-full border border-success/25 bg-success/10 px-3 py-1 text-xs font-medium text-success">
              <span className="relative flex size-2">
                <span className="absolute inset-0 rounded-full bg-success/40 animate-status-pulse" />
                <span className="relative size-2 rounded-full bg-success" />
              </span>
              {profile.availability}
            </p>
            <h3 className="mt-4 text-xl font-semibold tracking-tight text-foreground">Let's build something</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              Open to new opportunities, AI consulting and collaborations. Email is the fastest way to reach me.
            </p>
            <p className="mt-3 flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin aria-hidden="true" className="size-3.5" />
              Based in {profile.location} · {profile.timezone}
            </p>

            <ul className="mt-5 flex flex-col gap-2">
              {profile.contactLinks.map((link) => {
                const Icon = CONTACT_ICONS[link.name] ?? ArrowUpRight;
                const isEmail = link.url.startsWith('mailto:');
                return (
                  <li key={link.name} className="flex items-center gap-2">
                    <a
                      href={link.url}
                      {...(isEmail ? {} : { target: '_blank', rel: 'noopener noreferrer' })}
                      className={cn(
                        'group flex min-w-0 flex-1 items-center gap-3 rounded-lg border border-border px-3 py-2',
                        'transition-colors hover:border-foreground/25 hover:bg-accent/40',
                        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                        isEmail && 'border-primary/30 bg-primary/[0.06]',
                      )}
                    >
                      <Icon className={cn('size-4 shrink-0', isEmail ? 'text-primary' : 'text-muted-foreground')} />
                      <span className="flex min-w-0 flex-col">
                        <span className="text-sm font-medium text-foreground">{link.name}</span>
                        <span className="truncate text-xs text-muted-foreground">{link.label}</span>
                      </span>
                      <ArrowUpRight
                        aria-hidden="true"
                        className="ml-auto size-4 shrink-0 text-muted-foreground transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 motion-reduce:transition-none"
                      />
                      {!isEmail && <span className="sr-only">(opens in new tab)</span>}
                    </a>
                    {isEmail && email && <CopyEmailButton email={email.label} />}
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="rounded-2xl border border-border p-6 max-xs:p-5">
            <h3 className="font-mono text-xs font-medium uppercase tracking-[0.2em] text-muted-foreground">Toolbox</h3>
            <p className="mt-2 text-sm text-muted-foreground">
              Technologies that recur across these projects. Select one to filter the work.
            </p>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {toolbox.map(({ name, count }) => (
                <TechChip key={name} name={name} count={count} onClick={(technology) => showWork({ stack: technology })} />
              ))}
            </div>
          </div>
        </aside>
      </div>
    </Section>
  );
}

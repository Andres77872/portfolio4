import { useId, useState } from 'react';
import { Layers, RotateCcw, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { PROJECT_CATEGORIES, type CategoryFilter, type TechnologyUsage } from './catalog';
import { TechChip } from './ProjectMeta';

const COLLAPSED_TECH_COUNT = 18;

interface ProjectToolbarProps {
  category: CategoryFilter;
  categoryCounts: Record<CategoryFilter, number>;
  onCategoryChange: (category: CategoryFilter) => void;
  query: string;
  onQueryChange: (query: string) => void;
  technologies: readonly string[];
  technologyUsage: readonly TechnologyUsage[];
  onToggleTechnology: (technology: string) => void;
  isFiltered: boolean;
  resultCount: number;
  totalCount: number;
  onReset: () => void;
}

export default function ProjectToolbar({
  category,
  categoryCounts,
  onCategoryChange,
  query,
  onQueryChange,
  technologies,
  technologyUsage,
  onToggleTechnology,
  isFiltered,
  resultCount,
  totalCount,
  onReset,
}: ProjectToolbarProps) {
  const [isStackOpen, setIsStackOpen] = useState(false);
  const [showAllTech, setShowAllTech] = useState(false);
  const stackPanelId = useId();

  const categories: { id: CategoryFilter; label: string }[] = [
    { id: 'all', label: 'All' },
    ...PROJECT_CATEGORIES.map(({ id, label }) => ({ id, label })),
  ];

  // Keep selected technologies visible even when the list is collapsed.
  const collapsed = technologyUsage.slice(0, COLLAPSED_TECH_COUNT);
  const visibleTech = showAllTech
    ? technologyUsage
    : [
        ...collapsed,
        ...technologyUsage.filter(
          (usage) => technologies.includes(usage.name) && !collapsed.some((item) => item.name === usage.name),
        ),
      ];

  return (
    <div className="mb-10 flex flex-col gap-4 max-md:mb-8">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div
          role="group"
          aria-label="Filter by category"
          className={cn(
            'flex gap-1.5 overflow-x-auto md:flex-wrap md:overflow-visible',
            'max-md:-mx-4 max-md:w-[calc(100%+2rem)] max-md:px-4 max-md:pb-1',
            '[scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
          )}
        >
          {categories.map(({ id, label }) => {
            const isActive = category === id;
            return (
              <button
                key={id}
                type="button"
                aria-pressed={isActive}
                onClick={() => onCategoryChange(id)}
                className={cn(
                  'relative inline-flex h-9 shrink-0 items-center gap-2 rounded-full border px-3.5 text-sm font-medium',
                  'transition-colors duration-150',
                  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring',
                  isActive
                    ? 'border-foreground bg-foreground text-background'
                    : 'border-border bg-card/60 text-muted-foreground hover:border-foreground/25 hover:text-foreground',
                )}
              >
                {label}
                <span className={cn('font-mono text-xs tabular-nums', isActive ? 'opacity-70' : 'opacity-60')}>
                  {categoryCounts[id]}
                  <span className="sr-only"> projects</span>
                </span>
              </button>
            );
          })}
        </div>

        <div className="flex w-full items-center gap-2 md:w-auto">
          <div className="relative flex-1 md:w-64 md:flex-none">
            <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === 'Escape' && query) {
                  event.stopPropagation();
                  onQueryChange('');
                }
              }}
              placeholder="Search projects"
              aria-label="Search projects"
              className="h-9 rounded-full bg-card/60 pl-9 pr-9 [&::-webkit-search-cancel-button]:hidden"
            />
            {query && (
              <button
                type="button"
                onClick={() => onQueryChange('')}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 flex size-6 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
          <Button
            type="button"
            variant="outline"
            aria-expanded={isStackOpen}
            aria-controls={stackPanelId}
            onClick={() => setIsStackOpen((open) => !open)}
            className={cn('h-9 rounded-full bg-card/60', isStackOpen && 'border-foreground/30 text-foreground')}
          >
            <Layers />
            Stack
            {technologies.length > 0 && (
              <span className="rounded-full bg-primary px-1.5 font-mono text-[0.6875rem] leading-5 text-primary-foreground">
                {technologies.length}
              </span>
            )}
          </Button>
        </div>
      </div>

      {isStackOpen && (
        <div
          id={stackPanelId}
          role="group"
          aria-label="Filter by technology"
          className="animate-in fade-in-0 slide-in-from-top-1 rounded-xl border border-border bg-card/60 p-4 duration-200"
        >
          <p className="mb-3 text-xs text-muted-foreground">
            Sorted by how many projects use each technology. Selecting several shows projects that use all of them.
          </p>
          <div className="flex flex-wrap gap-1.5">
            {visibleTech.map(({ name, count }) => (
              <TechChip
                key={name}
                name={name}
                count={count}
                selected={technologies.includes(name)}
                onClick={onToggleTechnology}
              />
            ))}
          </div>
          {technologyUsage.length > COLLAPSED_TECH_COUNT && (
            <Button
              type="button"
              variant="link"
              size="sm"
              onClick={() => setShowAllTech((value) => !value)}
              className="mt-2 h-auto px-0 text-xs"
            >
              {showAllTech ? 'Show fewer' : `Show all ${technologyUsage.length}`}
            </Button>
          )}
        </div>
      )}

      {isFiltered && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-muted-foreground" role="status">
            Showing <span className="font-medium text-foreground tabular-nums">{resultCount}</span> of {totalCount}
          </span>
          {technologies.map((technology) => (
            <button
              key={technology}
              type="button"
              onClick={() => onToggleTechnology(technology)}
              aria-label={`Remove ${technology} filter`}
              className="inline-flex items-center gap-1 rounded-md border border-primary/40 bg-primary/12 px-2 py-0.5 font-mono text-[0.6875rem] uppercase tracking-wide text-primary hover:bg-primary/20"
            >
              {technology}
              <X aria-hidden="true" className="size-3" />
            </button>
          ))}
          <Button type="button" variant="ghost" size="sm" onClick={onReset} className="h-7 px-2 text-xs text-muted-foreground">
            <RotateCcw />
            Reset
          </Button>
        </div>
      )}
    </div>
  );
}

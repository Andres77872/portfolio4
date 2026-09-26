import { Suspense, lazy, useEffect, useMemo, useState } from 'react';
import { SearchX } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSearchParam, writeSearchParams } from '@/hooks/useSearchParam';
import Section from '../common/Section';
import {
  catalog,
  filterProjects,
  findProjectBySlug,
  getCategoryCounts,
  getFeaturedProjects,
  getPortfolioStats,
  getTechnologyUsage,
  isCategoryId,
  isFilterActive,
  sortByNewest,
  type CategoryFilter,
} from './catalog';
import FeaturedProjectCard from './FeaturedProjectCard';
import ProjectCard from './ProjectCard';
import ProjectToolbar from './ProjectToolbar';
import { SHOW_WORK_EVENT, openProjectModal, showWork } from './projectLink';
import type { CatalogProject } from './types';

const loadProjectModal = () => import('./ProjectModal');
const ProjectModal = lazy(loadProjectModal);

const featuredProjects = getFeaturedProjects(catalog);
const otherProjects = sortByNewest(catalog.filter((project) => project.featured === undefined));
const curatedOrder = [...featuredProjects, ...otherProjects];
const categoryCounts = getCategoryCounts(catalog);
const technologyUsage = getTechnologyUsage(catalog);
const stats = getPortfolioStats(catalog);
const knownTechnologies = new Set(technologyUsage.map((usage) => usage.name));

const parseStackParam = (value: string | null): string[] =>
  value
    ? Array.from(new Set(value.split(',').map((item) => item.trim().toUpperCase()))).filter((item) =>
        knownTechnologies.has(item),
      )
    : [];

const isModalHistoryEntry = () =>
  (window.history.state as { projectModal?: boolean } | null)?.projectModal === true;

function ProjectGrid({
  projects,
  onOpen,
  selectedTechnologies,
}: {
  projects: CatalogProject[];
  onOpen: (project: CatalogProject) => void;
  selectedTechnologies: readonly string[];
}) {
  return (
    <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {projects.map((project, index) => (
        <li key={project.slug} className="flex">
          <ProjectCard project={project} onOpen={onOpen} selectedTechnologies={selectedTechnologies} index={index} />
        </li>
      ))}
    </ul>
  );
}

export default function Projects() {
  const categoryParam = useSearchParam('category');
  const stackParam = useSearchParam('stack');
  const projectParam = useSearchParam('project');
  const [query, setQuery] = useState('');

  const category: CategoryFilter = isCategoryId(categoryParam) ? categoryParam : 'all';
  const technologies = useMemo(() => parseStackParam(stackParam), [stackParam]);
  const filter = { category, query, technologies };
  const isFiltered = isFilterActive(filter);

  const results = useMemo(
    () => sortByNewest(filterProjects(catalog, { category, query, technologies })),
    [category, query, technologies],
  );

  const selectedProject = findProjectBySlug(catalog, projectParam);
  const visibleOrder = isFiltered ? results : curatedOrder;
  const modalOrder = selectedProject && visibleOrder.includes(selectedProject) ? visibleOrder : curatedOrder;
  const modalIndex = selectedProject ? modalOrder.indexOf(selectedProject) : -1;

  // Warm the modal chunk once the page is idle so the first open is instant.
  useEffect(() => {
    if ('requestIdleCallback' in window) {
      const id = window.requestIdleCallback(() => void loadProjectModal());
      return () => window.cancelIdleCallback(id);
    }
    const timeout = setTimeout(() => void loadProjectModal(), 2000);
    return () => clearTimeout(timeout);
  }, []);

  // Filters applied from elsewhere (About, chat links) describe the whole list; a stale search would hide part of it.
  useEffect(() => {
    const clearSearch = () => setQuery('');
    window.addEventListener(SHOW_WORK_EVENT, clearSearch);
    return () => window.removeEventListener(SHOW_WORK_EVENT, clearSearch);
  }, []);

  // Reflect the open project in the tab title.
  useEffect(() => {
    if (!selectedProject) return;
    const previousTitle = document.title;
    document.title = `${selectedProject.title} · Andres Arizmendi`;
    return () => {
      document.title = previousTitle;
    };
  }, [selectedProject]);

  const openProject = (project: CatalogProject) => openProjectModal(project.slug);

  const navigateProject = (project: CatalogProject) => writeSearchParams({ project: project.slug });

  const closeProject = () => {
    // Pop the entry we pushed so Back/Forward stay meaningful; deep-link landings just drop the param.
    if (isModalHistoryEntry()) window.history.back();
    else writeSearchParams({ project: null });
  };

  const setCategory = (next: CategoryFilter) => writeSearchParams({ category: next === 'all' ? null : next });

  const toggleTechnology = (technology: string) => {
    const next = technologies.includes(technology)
      ? technologies.filter((item) => item !== technology)
      : [...technologies, technology];
    writeSearchParams({ stack: next.join(',') || null });
  };

  const resetFilters = () => {
    setQuery('');
    writeSearchParams({ category: null, stack: null });
  };

  const showProjectsUsing = (technology: string) => showWork({ stack: technology });

  return (
    <Section
      id="projects"
      eyebrow="01 — Work"
      title="Selected work"
      description="Retrieval engines, agent tooling, fine-tuned models and games. Every project is live or open source."
      actions={
        <p className="font-mono text-sm text-muted-foreground">
          {stats.total} projects
          {stats.firstYear && stats.latestYear ? ` · ${stats.firstYear}–${stats.latestYear}` : ''}
        </p>
      }
    >
      <ProjectToolbar
        category={category}
        categoryCounts={categoryCounts}
        onCategoryChange={setCategory}
        query={query}
        onQueryChange={setQuery}
        technologies={technologies}
        technologyUsage={technologyUsage}
        onToggleTechnology={toggleTechnology}
        isFiltered={isFiltered}
        resultCount={results.length}
        totalCount={catalog.length}
        onReset={resetFilters}
      />

      {!isFiltered ? (
        <>
          <div className="flex flex-col gap-6">
            {featuredProjects[0] && (
              <FeaturedProjectCard project={featuredProjects[0]} onOpen={openProject} variant="lead" />
            )}
            <div className="grid gap-6 md:grid-cols-2">
              {featuredProjects.slice(1).map((project) => (
                <FeaturedProjectCard key={project.slug} project={project} onOpen={openProject} />
              ))}
            </div>
          </div>

          {otherProjects.length > 0 && (
            <div className="mt-20 max-md:mt-14">
              <div className="mb-6 flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="text-xl font-semibold tracking-tight text-foreground">More projects</h3>
                <p className="text-sm text-muted-foreground">Newest first</p>
              </div>
              <ProjectGrid projects={otherProjects} onOpen={openProject} selectedTechnologies={technologies} />
            </div>
          )}
        </>
      ) : results.length > 0 ? (
        <ProjectGrid projects={results} onOpen={openProject} selectedTechnologies={technologies} />
      ) : (
        <div className="flex flex-col items-center rounded-2xl border border-dashed border-border px-6 py-16 text-center">
          <SearchX aria-hidden="true" className="mb-4 size-8 text-muted-foreground" />
          <h3 className="text-base font-semibold text-foreground">No projects match these filters</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">
            Try a broader search, another category, or fewer technologies.
          </p>
          <Button type="button" variant="outline" size="sm" onClick={resetFilters} className="mt-5">
            Reset filters
          </Button>
        </div>
      )}

      {selectedProject && (
        <Suspense fallback={null}>
          <ProjectModal
            project={selectedProject}
            previous={modalOrder[modalIndex - 1] ?? null}
            next={modalOrder[modalIndex + 1] ?? null}
            position={{ index: modalIndex, total: modalOrder.length }}
            onClose={closeProject}
            onNavigate={navigateProject}
            selectedTechnologies={technologies}
            onTechnologyClick={showProjectsUsing}
          />
        </Suspense>
      )}
    </Section>
  );
}

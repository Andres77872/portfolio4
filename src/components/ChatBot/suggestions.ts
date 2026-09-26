import { PROJECT_CATEGORIES, getFeaturedProjects } from '@/components/Projects/catalog';
import type { CatalogProject, ProjectCategoryId } from '@/components/Projects/types';
import type { Profile } from '@/data/profile';

export interface Suggestion {
  id: string;
  /** Short chip text. */
  label: string;
  /** Sent as the visitor's message. */
  prompt: string;
}

export interface WelcomeSuggestionsInput {
  projects: readonly CatalogProject[];
  profile: Profile;
  activeCategory: ProjectCategoryId | null;
}

export function getWelcomeSuggestions({ projects, profile, activeCategory }: WelcomeSuggestionsInput): Suggestion[] {
  const suggestions: Suggestion[] = [];
  const category = activeCategory ? PROJECT_CATEGORIES.find(({ id }) => id === activeCategory) : undefined;

  suggestions.push(
    category
      ? {
          id: 'tour',
          label: `Best of ${category.label}`,
          prompt: `What are the standout projects in ${category.label}?`,
        }
      : {
          id: 'tour',
          label: 'Tour the featured work',
          prompt: "Give me a quick tour of Andres's featured projects.",
        },
  );

  const [lead] = getFeaturedProjects(projects);
  if (lead) {
    suggestions.push({
      id: 'featured-1',
      label: `How does ${lead.title} work?`,
      prompt: `How does ${lead.title} work, and what did Andres build?`,
    });
  }

  suggestions.push({
    id: 'open-source',
    label: 'Open-source projects',
    prompt: "Which of Andres's projects are open source, and where is the code?",
  });

  if (profile.availability.trim()) {
    suggestions.push({
      id: 'availability',
      label: 'Is Andres available?',
      prompt: 'Is Andres available for new projects, and how can I reach him?',
    });
  }

  return suggestions;
}

export function getProjectSuggestions(project: CatalogProject): Suggestion[] {
  const { title } = project;
  const suggestions: Suggestion[] = [
    { id: 'problem', label: 'What problem does it solve?', prompt: `What problem does ${title} solve?` },
    { id: 'built', label: 'How is it built?', prompt: `How is ${title} built, and what did Andres do himself?` },
    { id: 'similar', label: 'Similar projects', prompt: `Which other projects are similar to ${title}?` },
  ];

  if (project.url) {
    suggestions.push({ id: 'try', label: 'Where can I try it?', prompt: `Where can I try ${title}?` });
  } else if (project.repoUrl) {
    suggestions.push({ id: 'code', label: "Where's the code?", prompt: `Where is the source code for ${title}?` });
  }

  return suggestions;
}

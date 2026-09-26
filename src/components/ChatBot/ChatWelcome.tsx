import { useMemo } from 'react';

import { catalog, isCategoryId } from '@/components/Projects/catalog';
import type { CatalogProject } from '@/components/Projects/types';
import { profile } from '@/data/profile';
import { useSearchParam } from '@/hooks/useSearchParam';
import { cn } from '@/lib/utils';

import { focusRing, monoLabel, suggestionChip } from './styles';
import { getProjectSuggestions, getWelcomeSuggestions, type Suggestion } from './suggestions';

interface SuggestionChipsProps {
  suggestions: readonly Suggestion[];
  onPick(prompt: string): void;
  labelledBy?: string;
  label?: string;
  className?: string;
}

/** A labelled group of one-tap questions; the prompt (not the label) is sent. */
export function SuggestionChips({ suggestions, onPick, labelledBy, label, className }: SuggestionChipsProps) {
  return (
    <div role="group" aria-labelledby={labelledBy} aria-label={label} className={cn('flex flex-wrap gap-1.5', className)}>
      {suggestions.map((suggestion) => (
        <button
          key={suggestion.id}
          type="button"
          onClick={() => onPick(suggestion.prompt)}
          className={cn(suggestionChip, focusRing)}
        >
          {suggestion.label}
        </button>
      ))}
    </div>
  );
}

interface ChatWelcomeProps {
  focusProject: CatalogProject | null;
  onPick(prompt: string): void;
  /** Leaves a project-focused welcome (e.g. one left over from an earlier "Ask about this project"). */
  onClearFocus(): void;
}

const TRY_LABEL_ID = 'chat-try-label';

/** Empty state: left-aligned and bottom-anchored so the chips sit right above the composer. */
export default function ChatWelcome({ focusProject, onPick, onClearFocus }: ChatWelcomeProps) {
  const categoryParam = useSearchParam('category');
  const activeCategory = isCategoryId(categoryParam) ? categoryParam : null;

  const suggestions = useMemo(
    () =>
      focusProject
        ? getProjectSuggestions(focusProject)
        : getWelcomeSuggestions({ projects: catalog, profile, activeCategory }),
    [focusProject, activeCategory],
  );

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto overscroll-contain px-4 pb-3 pt-6 group-data-[short]/panel:h-40 group-data-[short]/panel:flex-none">
      {/* Bottom-anchored with an auto top margin, not justify-end: justify-end pushes overflow past the
          top edge, where it cannot be scrolled to (short sheet, 400% zoom). */}
      <div className="mt-auto flex flex-col gap-1.5">
        <p className={cn(monoLabel, 'text-[0.6875rem] font-medium')}>
          {focusProject ? `Ask about ${focusProject.title}` : 'Ask the portfolio'}
        </p>
        <p className="text-sm leading-relaxed text-muted-foreground">
          {focusProject
            ? `Questions here are about ${focusProject.title} unless you say otherwise.`
            : "Ask about Andres's projects, stack or availability. Answers link straight to the work."}
        </p>
        {focusProject && (
          <button
            type="button"
            onClick={onClearFocus}
            className={cn(
              'w-fit rounded-sm text-sm font-medium text-foreground underline decoration-primary/50 decoration-2 underline-offset-4 hover:decoration-primary',
              focusRing,
            )}
          >
            Ask about all projects instead
          </button>
        )}
      </div>
      <div className="flex flex-col gap-2">
        <p id={TRY_LABEL_ID} className={monoLabel}>
          Try asking
        </p>
        <SuggestionChips suggestions={suggestions} onPick={onPick} labelledBy={TRY_LABEL_ID} />
      </div>
    </div>
  );
}

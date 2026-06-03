import { Tag } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { SectionHeader } from './SectionHeader';
import { Project } from './types';

interface ProjectTagsProps {
  project: Project;
  selectedTags: string[];
  onTagClick?: (tag: string) => void;
}

/**
 * Tags section with clickable badges for filtering
 */
export function ProjectTags({ project, selectedTags, onTagClick }: ProjectTagsProps) {
  if (!project.tags?.length) return null;

  const handleTagClick = (tag: string) => {
    onTagClick?.(tag);
  };

  return (
    <section className="px-6 pt-6 pb-8 max-xs:px-4">
      <SectionHeader icon={<Tag className="w-4 h-4" />} title="Technologies" />
      <div className="flex flex-wrap gap-2">
        {project.tags.map((tag: string) => (
          <Badge
            key={tag}
            variant="outline"
            className={cn(
              'text-xs px-3 py-1 cursor-pointer',
              'transition-all duration-200',
              'hover:scale-[1.02]',
              selectedTags.includes(tag.toUpperCase())
                ? 'bg-primary/20 text-primary border-primary/40 shadow-sm shadow-primary/10'
                : 'bg-muted/50 text-muted-foreground border-border hover:border-primary/30 hover:text-foreground'
            )}
            onClick={() => handleTagClick(tag)}
          >
            {tag}
          </Badge>
        ))}
      </div>
      {onTagClick && (
        <p className="text-xs text-muted-foreground mt-3 italic">
          Click on a tag to filter projects by technology
        </p>
      )}
    </section>
  );
}
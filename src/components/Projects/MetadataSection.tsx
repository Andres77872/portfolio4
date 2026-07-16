import { Code, BookOpen, Calendar, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MetadataCard } from './MetadataCard';
import { AuthBadge } from './AuthBadge';
import { getLanguageColor } from './constants';
import { Project } from './types';

interface MetadataSectionProps {
  project: Project;
}

/**
 * Metadata grid section displaying project metadata cards
 * Languages, License, Release Date, Authentication
 */
export function MetadataSection({ project }: MetadataSectionProps) {
  return (
    <div
      className={cn(
        'grid gap-3 px-6 pt-6',
        'grid-cols-[repeat(auto-fill,minmax(180px,1fr))]',
        'max-md:grid-cols-2',
        'max-xs:grid-cols-1 max-xs:px-4'
      )}
    >
      {project.language && project.language.length > 0 && (
        <MetadataCard icon={<Code className="w-4 h-4" />} label="Languages">
          <div className="flex flex-wrap gap-2 mt-2">
            {project.language.map((lang, index) => (
              <span
                key={index}
                className="inline-flex items-center gap-1.5 text-sm text-foreground/80"
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0 ring-1 ring-white/20"
                  style={{ backgroundColor: getLanguageColor(lang) }}
                />
                {lang}
              </span>
            ))}
          </div>
        </MetadataCard>
      )}

      {project.license && (
        <MetadataCard icon={<BookOpen className="w-4 h-4" />} label="License">
          <span className="text-sm text-foreground/80 mt-2 font-medium">
            {project.license}
          </span>
        </MetadataCard>
      )}

      {project.releaseDate && (
        <MetadataCard icon={<Calendar className="w-4 h-4" />} label="Released">
          <span className="text-sm text-foreground/80 mt-2">
            {project.releaseDate}
          </span>
        </MetadataCard>
      )}

      {project.auth && (
        <MetadataCard icon={<Lock className="w-4 h-4" />} label="Authentication">
          <div className="flex items-center gap-3 mt-2">
            <AuthBadge active={project.auth.login} label="Login" />
            <AuthBadge active={project.auth.register} label="Register" />
          </div>
        </MetadataCard>
      )}
    </div>
  );
}
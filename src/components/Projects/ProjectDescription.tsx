import ReactMarkdown from 'react-markdown';
import { FileText } from 'lucide-react';
import { cn } from '@/lib/utils';
import { SectionHeader } from './SectionHeader';
import { Project } from './types';

interface ProjectDescriptionProps {
  project: Project;
}

/**
 * Description section with markdown rendering
 */
export function ProjectDescription({ project }: ProjectDescriptionProps) {
  return (
    <section className="px-6 pt-6 max-xs:px-4">
      <SectionHeader icon={<FileText className="w-4 h-4" />} title="About This Project" />
      <div
        className={cn(
          'text-sm text-muted-foreground leading-relaxed',
          'prose prose-sm max-w-none dark:prose-invert',
          '[&_a]:text-primary [&_a]:no-underline [&_a]:font-medium',
          '[&_a:hover]:text-primary/80',
          '[&_strong]:text-foreground [&_strong]:font-semibold',
          '[&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono [&_code]:text-foreground',
          '[&_pre]:bg-muted [&_pre]:p-4 [&_pre]:rounded-lg [&_pre]:border [&_pre]:border-border',
          '[&_blockquote]:border-l-2 [&_blockquote]:border-primary/40 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-muted-foreground',
          '[&_ul]:list-disc [&_ul]:pl-5 [&_ul]:space-y-1',
          '[&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:space-y-1',
          '[&_li]:text-muted-foreground',
          '[&_h1]:text-lg [&_h1]:font-semibold [&_h1]:text-foreground [&_h1]:mt-4 [&_h1]:mb-2',
          '[&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground [&_h2]:mt-3 [&_h2]:mb-2'
        )}
      >
        <ReactMarkdown>{project.descriptionMD}</ReactMarkdown>
      </div>
    </section>
  );
}
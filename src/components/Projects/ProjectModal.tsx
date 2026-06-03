import React from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
} from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { useBodyScrollLock } from '@/hooks/useBodyScrollLock';

import { ProjectHero } from './ProjectHero';
import { MetadataSection } from './MetadataSection';
import { ProjectDescription } from './ProjectDescription';
import { ProjectTags } from './ProjectTags';
import ProjectLinkButtons from './ProjectLinkButtons';

import { Project } from './types';

interface ProjectModalProps {
    project: Project;
    isOpen: boolean;
    onClose: () => void;
    selectedTags: string[];
    onTagClick?: (tag: string) => void;
}

/**
 * Project details modal with hero image, metadata, description, and tags
 * Uses composition pattern with separate components for each section
 */
const ProjectModal: React.FC<ProjectModalProps> = ({
    project,
    isOpen,
    onClose,
    selectedTags,
    onTagClick,
}) => {
    useBodyScrollLock(isOpen);

    const handleTagClick = (tag: string) => {
        if (onTagClick) {
            onTagClick(tag);
            onClose();
        }
    };

    if (!isOpen) return null;

    return (
        <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
            <DialogContent
                className={cn(
                    'max-w-[950px] max-h-[90vh] p-0 gap-0 overflow-hidden',
                    'bg-background/95 backdrop-blur-xl border-border/50',
                    'shadow-2xl shadow-primary/5',
                    'max-xs:max-w-full max-xs:max-h-[100dvh] max-xs:rounded-none max-xs:border-x-0'
                )}
                showCloseButton={true}
                aria-labelledby="modal-title"
            >
                <ScrollArea className="max-h-[90vh] max-xs:max-h-[100dvh]">
                    {/* Hero Section */}
                    <ProjectHero project={project} />

                    {/* Sticky Header */}
                    <div
                        className={cn(
                            'sticky top-0 z-10',
                            'bg-background/80 backdrop-blur-lg',
                            'border-b border-border/50',
                            'px-6 py-4',
                            'max-xs:px-4'
                        )}
                    >
                        <DialogHeader className="gap-3">
                            <div className="flex items-start justify-between gap-4">
                                <div className="flex-1 min-w-0">
                                    <DialogTitle
                                        id="modal-title"
                                        className="text-xl font-semibold tracking-tight text-foreground"
                                    >
                                        {project.title}
                                    </DialogTitle>
                                    <DialogDescription className="sr-only">
                                        Details for {project.title} project
                                    </DialogDescription>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex-shrink-0">
                                    <ProjectLinkButtons
                                        repoUrl={project.repoUrl}
                                        apiUrl={project.apiUrl}
                                        url={project.url}
                                    />
                                </div>
                            </div>
                        </DialogHeader>
                    </div>

                    {/* Metadata Grid */}
                    <MetadataSection project={project} />

                    {/* Separator */}
                    <Separator className="mx-6 mt-6 max-xs:mx-4" />

                    {/* Description */}
                    <ProjectDescription project={project} />

                    {/* Tags */}
                    <ProjectTags
                        project={project}
                        selectedTags={selectedTags}
                        onTagClick={handleTagClick}
                    />
                </ScrollArea>
            </DialogContent>
        </Dialog>
    );
};

export default ProjectModal;

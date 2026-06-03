import React from 'react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Project } from './types';
import ProjectLinkButtons from './ProjectLinkButtons';

interface ProjectCardProps {
    project: Project;
    onCardClick: (project: Project) => void;
    onTagClick: (tag: string) => void;
    selectedTags: string[];
    index?: number;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onCardClick, onTagClick, selectedTags, index = 0 }) => {
    const handleCardClick = () => {
        onCardClick(project);
    };
    
    const handleTagClick = (tag: string, e: React.MouseEvent) => {
        e.stopPropagation();
        onTagClick(tag);
    };

    const isSelected = project.tags?.some(tag => selectedTags.includes(tag.toUpperCase()));
    const isLive = !!project.url;
    
    return (
        <Card 
            className={cn(
                "group relative flex flex-col gap-0 p-0 overflow-hidden cursor-pointer",
                "bg-card/60 backdrop-blur-sm border-border/50",
                "transition-all duration-300 ease-out",
                "hover:-translate-y-1 hover:shadow-lg hover:shadow-primary/5",
                "hover:border-primary/30 hover:bg-card/80",
                isSelected && "border-primary/40 bg-primary/5",
                "animate-card-fade-in",
                "motion-reduce:animate-none motion-reduce:transition-none",
            )}
            style={{ animationDelay: `${index * 0.05}s` }}
            onClick={handleCardClick}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleCardClick()}
            aria-label={`View ${project.title} project details`}
        >
            {/* Selected state indicator */}
            {isSelected && (
                <div className={cn(
                    "absolute top-0 left-0 right-0 h-1 z-[2]",
                    "bg-gradient-to-r from-primary via-primary/80 to-primary",
                )} />
            )}

            {/* Status Badge - Glassmorphism style */}
            <div className={cn(
                "absolute top-3 right-3 z-[3]",
                "flex items-center gap-2",
                "px-3 py-1.5 rounded-full",
                "text-xs font-medium tracking-wide",
                "bg-background/80 backdrop-blur-md",
                "border border-border/50 shadow-sm",
                "transition-all duration-200",
                "group-hover:bg-background/90 group-hover:shadow-md",
            )}>
                <span className={cn(
                    "relative w-2 h-2 rounded-full",
                    isLive ? "bg-emerald-500" : "bg-indigo-500",
                )}>
                    <span className={cn(
                        "absolute inset-0 rounded-full animate-ping",
                        isLive ? "bg-emerald-500/40" : "bg-indigo-500/40",
                    )} />
                </span>
                <span className={cn(
                    isLive ? "text-emerald-600 dark:text-emerald-400" : "text-indigo-600 dark:text-indigo-400",
                )}>
                    {isLive ? 'Live' : 'Repo'}
                </span>
            </div>

            {/* Image Container with sophisticated overlay */}
            <div className="relative aspect-[16/10] overflow-hidden bg-muted/30">
                {project.image ? (
                    <img 
                        src={project.image} 
                        alt={project.title} 
                        loading="lazy" 
                        className={cn(
                            "w-full h-full object-cover",
                            "transition-transform duration-500 ease-out",
                            "group-hover:scale-[1.05]",
                        )}
                    />
                ) : (
                    <div className="flex items-center justify-center w-full h-full">
                        <div className={cn(
                            "flex flex-col items-center gap-2",
                            "text-muted-foreground/50",
                        )}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" fill="currentColor" viewBox="0 0 16 16" className="opacity-40">
                                <path d="M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h12zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z"/>
                                <path d="M6.854 4.646a.5.5 0 0 1 0 .708L4.207 8l2.647 2.646a.5.5 0 0 1-.708.708l-3-3a.5.5 0 0 1 0-.708l3-3a.5.5 0 0 1 .708 0zm2.292 0a.5.5 0 0 0 0 .708L11.793 8l-2.647 2.646a.5.5 0 0 0 .708.708l3-3a.5.5 0 0 0 0-.708l-3-3a.5.5 0 0 0-.708 0z"/>
                            </svg>
                            <span className="text-xs font-medium">No preview</span>
                        </div>
                    </div>
                )}
                {/* Multi-layer gradient overlay */}
                <div className={cn(
                    "absolute inset-0 z-[1]",
                    "bg-gradient-to-t from-background/90 via-background/20 to-transparent",
                )} />
                {/* Hover shine effect */}
                <div className={cn(
                    "absolute inset-0 z-[2] opacity-0 group-hover:opacity-100",
                    "transition-opacity duration-500",
                    "bg-gradient-to-br from-white/10 via-transparent to-transparent",
                )} />
            </div>

            {/* Content Section */}
            <CardContent className="flex flex-col gap-3 p-4 flex-1">
                <div className="flex items-start justify-between gap-2">
                    <h3 className={cn(
                        "text-base font-semibold leading-snug",
                        "text-foreground transition-colors duration-200",
                        "group-hover:text-primary",
                    )}>
                        {project.title}
                    </h3>
                </div>
                <p className={cn(
                    "text-sm text-muted-foreground leading-relaxed",
                    "line-clamp-2",
                )}>
                    {project.description}
                </p>

                {/* Tags Section */}
                {project.tags && project.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                        {project.tags.map((tag: string) => (
                            <Badge
                                key={tag}
                                variant="outline"
                                className={cn(
                                    "text-[0.625rem] px-1.5 py-0 h-5 cursor-pointer",
                                    "transition-colors duration-150",
                                    selectedTags.includes(tag.toUpperCase())
                                        ? "bg-primary/15 text-primary border-primary/25"
                                        : "text-muted-foreground border-border hover:border-foreground/[0.15]",
                                )}
                                onClick={(e) => handleTagClick(tag, e as React.MouseEvent)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => e.key === 'Enter' && handleTagClick(tag, e as unknown as React.MouseEvent)}
                                aria-label={`Filter by ${tag}`}
                            >
                                {tag}
                            </Badge>
                        ))}
                    </div>
                )}
            </CardContent>

            {/* Action Buttons */}
            <CardFooter className="p-4 pt-2">
                <ProjectLinkButtons 
                    repoUrl={project.repoUrl} 
                    apiUrl={project.apiUrl} 
                    url={project.url} 
                    stopPropagation={true} 
                />
            </CardFooter>
        </Card>
    );
};

export default ProjectCard;

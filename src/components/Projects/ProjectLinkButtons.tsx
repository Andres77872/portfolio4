import React from 'react';
import { Code, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { GitHubIcon } from '@/components/icons';

interface ProjectLinkButtonsProps {
    repoUrl?: string;
    apiUrl?: string;
    url?: string;
    className?: string;
    stopPropagation?: boolean;
}

const ProjectLinkButtons: React.FC<ProjectLinkButtonsProps> = ({
    repoUrl,
    apiUrl,
    url,
    className = '',
    stopPropagation = false
}) => {
    const handleClick = (e: React.MouseEvent) => {
        if (stopPropagation) {
            e.stopPropagation();
        }
    };

    return (
        <div className={cn("flex flex-wrap gap-2", className)}>
            {repoUrl && (
                <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className={cn(
                        "gap-1.5 text-xs font-medium tracking-wide",
                        "text-muted-foreground",
                        "border-border bg-foreground/[0.03]",
                        "hover:bg-foreground/[0.06] hover:text-foreground",
                        "transition-colors duration-150",
                    )}
                >
                    <a
                        href={repoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="GitHub Repository"
                        onClick={handleClick}
                    >
                        <GitHubIcon className="size-3.5" />
                        GitHub
                    </a>
                </Button>
            )}
            {apiUrl && (
                <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className={cn(
                        "gap-1.5 text-xs font-medium tracking-wide",
                        "bg-info/10 border-info/25 text-info",
                        "hover:bg-info/15 hover:border-info/40",
                        "transition-colors duration-150",
                    )}
                >
                    <a
                        href={apiUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="API Documentation"
                        onClick={handleClick}
                    >
                        <Code className="size-3.5" />
                        API
                    </a>
                </Button>
            )}
            {url && (
                <Button
                    variant="outline"
                    size="sm"
                    asChild
                    className={cn(
                        "gap-1.5 text-xs font-medium tracking-wide",
                        "bg-success/10 border-success/25 text-success",
                        "hover:bg-success/15 hover:border-success/40",
                        "transition-colors duration-150",
                    )}
                >
                    <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        aria-label="Live Site"
                        onClick={handleClick}
                    >
                        <Globe className="size-3.5" />
                        Live Site
                    </a>
                </Button>
            )}
        </div>
    );
};

export default ProjectLinkButtons;

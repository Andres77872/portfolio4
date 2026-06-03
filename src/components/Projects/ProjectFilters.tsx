import React, { useState, useMemo } from 'react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface ProjectFiltersProps {
    searchTerm: string;
    selectedTags: string[];
    allTags: string[];
    onSearchChange: (value: string) => void;
    onTagToggle: (tag: string) => void;
    onClearAllTags: () => void;
}

const ProjectFilters: React.FC<ProjectFiltersProps> = ({
    searchTerm,
    selectedTags,
    allTags,
    onSearchChange,
    onTagToggle,
    onClearAllTags
}) => {
    const [isTagsExpanded, setIsTagsExpanded] = useState(false);
    const [tagSearchTerm, setTagSearchTerm] = useState('');

    // Filter and sort tags
    const filteredTags = useMemo(() => {
        let tags = allTags;
        
        // Filter by tag search
        if (tagSearchTerm) {
            tags = tags.filter(tag => 
                tag.toLowerCase().includes(tagSearchTerm.toLowerCase())
            );
        }

        // Sort: selected tags first, then alphabetically
        return tags.sort((a, b) => {
            const aSelected = selectedTags.includes(a);
            const bSelected = selectedTags.includes(b);
            if (aSelected && !bSelected) return -1;
            if (!aSelected && bSelected) return 1;
            return a.localeCompare(b);
        });
    }, [allTags, selectedTags, tagSearchTerm]);

    const visibleTags = isTagsExpanded ? filteredTags : filteredTags.slice(0, 12);
    const hasMoreTags = filteredTags.length > 12;

    return (
        <div className="flex flex-col gap-4 mb-6">
            {/* Search Container - Modern glassmorphism style */}
            <div className={cn(
                "relative",
                "rounded-lg",
                "bg-muted/30 backdrop-blur-sm",
                "border border-border/50",
                "transition-all duration-200",
                "focus-within:border-primary/30 focus-within:bg-muted/40",
            )}>
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
                        <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
                    </svg>
                </div>
                <Input
                    type="text"
                    placeholder="Search projects..."
                    value={searchTerm}
                    onChange={e => onSearchChange(e.target.value)}
                    className={cn(
                        "pl-11 pr-10 h-12",
                        "bg-transparent border-none",
                        "text-foreground placeholder:text-muted-foreground/60",
                        "focus-visible:ring-0 focus-visible:ring-offset-0",
                        "focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2",
                    )}
                    aria-label="Search projects"
                />
                {searchTerm && (
                    <button 
                        className={cn(
                            "absolute right-4 top-1/2 -translate-y-1/2",
                            "p-1 rounded-md",
                            "text-muted-foreground hover:text-foreground",
                            "hover:bg-muted/50",
                            "transition-all duration-150",
                            "focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2",
                        )}
                        onClick={() => onSearchChange('')}
                        aria-label="Clear search"
                    >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
                        </svg>
                    </button>
                )}
            </div>

            {/* Filter Tags Section - Modern design */}
            <div className={cn(
                "flex flex-col gap-3",
                "rounded-lg",
                "bg-muted/20 backdrop-blur-sm",
                "border border-border/40",
                "p-4",
            )}>
                {/* Filter Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className={cn(
                            "flex items-center gap-2",
                            "text-sm font-medium text-foreground",
                        )}>
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16" className="text-muted-foreground">
                                <path d="M6 10.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5zm-2-3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm-2-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5z"/>
                            </svg>
                            Technologies
                        </span>
                        {selectedTags.length > 0 && (
                            <Badge variant="secondary" className="text-xs px-2 py-0.5 bg-primary/10 text-primary border-primary/20">
                                {selectedTags.length} selected
                            </Badge>
                        )}
                    </div>
                    
                    {selectedTags.length > 0 && (
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={onClearAllTags}
                            className={cn(
                                "h-7 px-2 text-xs",
                                "text-muted-foreground hover:text-foreground",
                                "hover:bg-muted/50",
                            )}
                        >
                            Clear all
                        </Button>
                    )}
                </div>

                {/* Tag Search Input */}
                {allTags.length > 12 && (
                    <div className="relative">
                        <Input
                            type="text"
                            placeholder="Search technologies..."
                            value={tagSearchTerm}
                            onChange={e => setTagSearchTerm(e.target.value)}
                            className={cn(
                                "h-8 text-xs pl-8",
                                "bg-muted/30 border-border/50",
                            )}
                            aria-label="Search technologies"
                        />
                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" className="absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground">
                            <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
                        </svg>
                    </div>
                )}

                {/* Tags Grid */}
                <div className={cn(
                    "flex flex-wrap gap-2",
                    "max-h-[200px] overflow-y-auto",
                    "pr-1",
                )}>
                    {visibleTags.map((tag) => (
                        <Badge
                            key={tag}
                            variant="outline"
                            className={cn(
                                "cursor-pointer select-none",
                                "text-xs px-3 py-1.5",
                                "transition-all duration-200",
                                "hover:scale-[1.02]",
                                selectedTags.includes(tag)
                                    ? "bg-primary/20 text-primary border-primary/40 shadow-sm shadow-primary/10"
                                    : "bg-muted/30 text-muted-foreground border-border/50 hover:border-primary/30 hover:text-foreground",
                            )}
                            onClick={() => onTagToggle(tag)}
                            role="button"
                            tabIndex={0}
                            onKeyDown={(e) => e.key === 'Enter' && onTagToggle(tag)}
                            aria-pressed={selectedTags.includes(tag)}
                        >
                            {tag}
                        </Badge>
                    ))}
                    
                    {filteredTags.length === 0 && tagSearchTerm && (
                        <span className="text-xs text-muted-foreground italic py-2">
                            No technologies found matching "{tagSearchTerm}"
                        </span>
                    )}
                </div>

                {/* Expand/Collapse Button */}
                {hasMoreTags && (
                    <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setIsTagsExpanded(!isTagsExpanded)}
                        className={cn(
                            "w-full h-8 text-xs",
                            "text-muted-foreground hover:text-foreground",
                            "hover:bg-muted/50",
                            "border border-border/30",
                        )}
                    >
                        {isTagsExpanded ? (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" className="mr-1">
                                    <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
                                </svg>
                                Show less
                            </>
                        ) : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16" className="mr-1">
                                    <path d="M8 4a.5.5 0 0 1 .5.5v3h3a.5.5 0 0 1 0 1h-3v3a.5.5 0 0 1-1 0v-3h-3a.5.5 0 0 1 0-1h3v-3A.5.5 0 0 1 8 4z"/>
                                </svg>
                                Show {filteredTags.length - 12} more
                            </>
                        )}
                    </Button>
                )}
            </div>
        </div>
    );
};

export default ProjectFilters;

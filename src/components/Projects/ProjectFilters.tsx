import React, { useState, useMemo } from 'react';
import { ChevronDown, ChevronUp, ListFilter, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

const COLLAPSED_TAG_COUNT = 12;

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

    const visibleTags = isTagsExpanded ? filteredTags : filteredTags.slice(0, COLLAPSED_TAG_COUNT);
    const hasMoreTags = filteredTags.length > COLLAPSED_TAG_COUNT;

    return (
        <div className="flex flex-col gap-4 mb-6">
            {/* Search Container */}
            <div className={cn(
                "relative",
                "rounded-lg",
                "bg-card border border-border",
                "transition-colors duration-200",
                "focus-within:border-primary/40",
            )}>
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4.5 text-muted-foreground pointer-events-none" />
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
                            "transition-colors duration-150",
                            "focus-visible:outline-2 focus-visible:outline-ring focus-visible:outline-offset-2",
                        )}
                        onClick={() => onSearchChange('')}
                        aria-label="Clear search"
                    >
                        <X className="size-4" />
                    </button>
                )}
            </div>

            {/* Filter Tags Section */}
            <div className={cn(
                "flex flex-col gap-3",
                "rounded-lg",
                "bg-card border border-border",
                "p-4",
            )}>
                {/* Filter Header */}
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <span className={cn(
                            "flex items-center gap-2",
                            "text-sm font-medium text-foreground",
                        )}>
                            <ListFilter className="size-4 text-muted-foreground" />
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
                {allTags.length > COLLAPSED_TAG_COUNT && (
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
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
                                "transition-colors duration-150",
                                selectedTags.includes(tag)
                                    ? "bg-primary/15 text-primary border-primary/30"
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
                                <ChevronUp className="size-3.5 mr-1" />
                                Show less
                            </>
                        ) : (
                            <>
                                <ChevronDown className="size-3.5 mr-1" />
                                Show {filteredTags.length - COLLAPSED_TAG_COUNT} more
                            </>
                        )}
                    </Button>
                )}
            </div>
        </div>
    );
};

export default ProjectFilters;

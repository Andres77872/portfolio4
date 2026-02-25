import React, { useState, useMemo } from 'react';
import '../../css/components/projects/ProjectFilters.css';

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

    const visibleTags = isTagsExpanded ? filteredTags : filteredTags.slice(0, 20);
    const hasMoreTags = filteredTags.length > 20;

    return (
        <div className="projects__filters">
            {/* Search Container */}
            <div className="projects__search-wrapper">
                <div className={`projects__search-container ${searchTerm ? 'projects__search-container--active' : ''}`}>
                    <div className="projects__search-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
                        </svg>
                    </div>
                    <input
                        type="text"
                        placeholder="Search projects by name or description..."
                        value={searchTerm}
                        onChange={e => onSearchChange(e.target.value)}
                        className="projects__search"
                        aria-label="Search projects"
                    />
                    {searchTerm && (
                        <button 
                            className="projects__search-clear" 
                            onClick={() => onSearchChange('')}
                            aria-label="Clear search"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            {/* Filter Tags Section */}
            <div className="projects__filter-section">
                {/* Filter Header */}
                <div className="projects__filter-header">
                    <div className="projects__filter-info">
                        <span className="projects__filter-label">
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M6 10.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5zm-2-3a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7a.5.5 0 0 1-.5-.5zm-2-3a.5.5 0 0 1 .5-.5h11a.5.5 0 0 1 0 1h-11a.5.5 0 0 1-.5-.5z"/>
                            </svg>
                            Filter by Technology
                        </span>
                        <span className="projects__filter-count">
                            {selectedTags.length > 0 ? (
                                <>
                                    <span className="projects__filter-count-number">{selectedTags.length}</span>
                                    <span>selected</span>
                                </>
                            ) : (
                                <span className="projects__filter-count-all">All {allTags.length} tags</span>
                            )}
                        </span>
                    </div>
                    
                    {selectedTags.length > 0 && (
                        <button 
                            className="projects__filter-clear-all" 
                            onClick={onClearAllTags}
                            aria-label="Clear all selected tags"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
                            </svg>
                            Clear filters
                        </button>
                    )}
                </div>

                {/* Tag Search (shows when many tags) */}
                {allTags.length > 15 && (
                    <div className="projects__tag-search">
                        <input
                            type="text"
                            placeholder="Find a tag..."
                            value={tagSearchTerm}
                            onChange={e => setTagSearchTerm(e.target.value)}
                            className="projects__tag-search-input"
                            aria-label="Search tags"
                        />
                    </div>
                )}

                {/* Tags Grid */}
                <div className={`projects__filter-tags ${isTagsExpanded ? 'projects__filter-tags--expanded' : ''}`}>
                    {visibleTags.map(tag => (
                        <button
                            key={tag}
                            className={`projects__filter-tag ${selectedTags.includes(tag) ? 'projects__filter-tag--selected' : ''}`}
                            onClick={() => onTagToggle(tag)}
                            aria-pressed={selectedTags.includes(tag)}
                        >
                            {selectedTags.includes(tag) && (
                                <svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" fill="currentColor" viewBox="0 0 16 16">
                                    <path d="M12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.4-6.425a.247.247 0 0 1 .02-.022Z"/>
                                </svg>
                            )}
                            {tag}
                        </button>
                    ))}
                </div>

                {/* Expand/Collapse Button */}
                {hasMoreTags && !tagSearchTerm && (
                    <button 
                        className="projects__filter-expand"
                        onClick={() => setIsTagsExpanded(!isTagsExpanded)}
                        aria-expanded={isTagsExpanded}
                    >
                        {isTagsExpanded ? (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                                    <path fillRule="evenodd" d="M7.646 4.646a.5.5 0 0 1 .708 0l6 6a.5.5 0 0 1-.708.708L8 5.707l-5.646 5.647a.5.5 0 0 1-.708-.708l6-6z"/>
                                </svg>
                                Show less
                            </>
                        ) : (
                            <>
                                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                                    <path fillRule="evenodd" d="M1.646 4.646a.5.5 0 0 1 .708 0L8 10.293l5.646-5.647a.5.5 0 0 1 .708.708l-6 6a.5.5 0 0 1-.708 0l-6-6a.5.5 0 0 1 0-.708z"/>
                                </svg>
                                Show {filteredTags.length - 20} more tags
                            </>
                        )}
                    </button>
                )}
            </div>
        </div>
    );
};

export default ProjectFilters;

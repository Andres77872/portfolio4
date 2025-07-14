import React from 'react';
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
    return (
        <div className="projects__filters">
            {/* Search container centered above tags */}
            <div className="projects__search-wrapper">
                <div className="projects__search-container">
                    <div className="projects__search-icon">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001c.03.04.062.078.098.115l3.85 3.85a1 1 0 0 0 1.415-1.414l-3.85-3.85a1.007 1.007 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0z"/>
                        </svg>
                    </div>
                    <input
                        type="text"
                        placeholder="Search projects..."
                        value={searchTerm}
                        onChange={e => onSearchChange(e.target.value)}
                        className="projects__search"
                    />
                    {searchTerm && (
                        <button 
                            className="projects__search-clear" 
                            onClick={() => onSearchChange('')}
                            aria-label="Clear search"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="currentColor" viewBox="0 0 16 16">
                                <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708z"/>
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            {/* Filter tags below search */}
            <div className="projects__filter-tags">
                {/* All Tags indicator */}
                <div className="projects__filter-status">
                    {selectedTags.length === 0 ? (
                        <span className="projects__filter-all-tags">All Tags</span>
                    ) : (
                        <>
                            <span>{selectedTags.length} selected</span>
                            <button 
                                className="projects__filter-clear-all" 
                                onClick={onClearAllTags}
                                aria-label="Clear all selected tags"
                            >
                                Clear all
                            </button>
                        </>
                    )}
                </div>
                
                {allTags.map(tag => (
                    <button
                        key={tag}
                        className={`projects__filter-tag ${selectedTags.includes(tag) ? 'projects__filter-tag--selected' : ''}`}
                        onClick={() => onTagToggle(tag)}
                    >
                        {tag}
                    </button>
                ))}
            </div>
        </div>
    );
};

export default ProjectFilters;

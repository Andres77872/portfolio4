import React from 'react';
import '../../css/components/projects/ProjectFilters.css';

interface ProjectFiltersProps {
    searchTerm: string;
    selectedTag: string;
    allTags: string[];
    onSearchChange: (value: string) => void;
    onTagChange: (value: string) => void;
}

const ProjectFilters: React.FC<ProjectFiltersProps> = ({
    searchTerm,
    selectedTag,
    allTags,
    onSearchChange,
    onTagChange
}) => {
    return (
        <div className="projects__filters">
            <input
                type="text"
                placeholder="Search projects..."
                value={searchTerm}
                onChange={e => onSearchChange(e.target.value)}
                className="projects__search"
            />
            <select
                value={selectedTag}
                onChange={e => onTagChange(e.target.value)}
                className="projects__tag-select"
            >
                <option value="">All Tags</option>
                {allTags.map(tag => (
                    <option key={tag} value={tag}>
                        {tag}
                    </option>
                ))}
            </select>
        </div>
    );
};

export default ProjectFilters;

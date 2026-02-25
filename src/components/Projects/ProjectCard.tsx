import React from 'react';
import { Project } from './types';
import ProjectLinkButtons from './ProjectLinkButtons';
import '../../css/components/projects/ProjectCard.css';

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
    const cardType = project.url ? 'projects__card--live' : 'projects__card--repo';
    
    return (
        <article 
            className={`projects__card ${cardType} ${isSelected ? 'projects__card--selected' : ''}`}
            onClick={handleCardClick}
            style={{ '--animation-delay': `${index * 0.08}s` } as React.CSSProperties}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => e.key === 'Enter' && handleCardClick()}
            aria-label={`View ${project.title} project details`}
        >
            {/* Status Badge */}
            <div className={`projects__badge ${project.url ? 'projects__badge--live' : 'projects__badge--repo'}`}>
                <span className="projects__badge-dot"></span>
                {project.url ? 'Live Project' : 'GitHub Repo'}
            </div>

            {/* Image Container with Overlay */}
            <div className="projects__card-image">
                {project.image ? (
                    <img src={project.image} alt={project.title} loading="lazy" />
                ) : (
                    <div className="projects__card-placeholder">
                        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" fill="currentColor" viewBox="0 0 16 16">
                            <path d="M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1h12zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2H2z"/>
                            <path d="M6.854 4.646a.5.5 0 0 1 0 .708L4.207 8l2.647 2.646a.5.5 0 0 1-.708.708l-3-3a.5.5 0 0 1 0-.708l3-3a.5.5 0 0 1 .708 0zm2.292 0a.5.5 0 0 0 0 .708L11.793 8l-2.647 2.646a.5.5 0 0 0 .708.708l3-3a.5.5 0 0 0 0-.708l-3-3a.5.5 0 0 0-.708 0z"/>
                        </svg>
                    </div>
                )}
                <div className="projects__card-overlay"></div>
            </div>

            {/* Content Section */}
            <div className="projects__card-content">
                <h3 className="projects__card-title">{project.title}</h3>
                <p className="projects__card-description">
                    {project.description.length > 120 
                        ? `${project.description.substring(0, 120)}...` 
                        : project.description}
                </p>

                {/* Tags Section */}
                {project.tags && project.tags.length > 0 && (
                    <div className="projects__tags">
                        {project.tags.map((tag: string) => (
                            <span
                                key={tag}
                                className={`projects__tag ${selectedTags.includes(tag.toUpperCase()) ? 'projects__tag--selected' : ''}`}
                                onClick={(e) => handleTagClick(tag, e)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={(e) => e.key === 'Enter' && handleTagClick(tag, e as unknown as React.MouseEvent)}
                                aria-label={`Filter by ${tag}`}
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* Action Buttons */}
            <div className="projects__card-actions">
                <ProjectLinkButtons 
                    repoUrl={project.repoUrl} 
                    apiUrl={project.apiUrl} 
                    url={project.url} 
                    stopPropagation={true} 
                />
            </div>
        </article>
    );
};

export default ProjectCard;

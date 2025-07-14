import React from 'react';
import '../../css/components/projects/ProjectCard.css';
// Importing from local types file
import { Project } from './types.ts';

interface ProjectCardProps {
    project: Project;
    onCardClick: (project: Project) => void;
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onCardClick }) => {
    const handleCardClick = () => {
        onCardClick(project);
    };
    
    return (
        <div 
            className={project.url ? 'projects__card--live' : 'projects__card--repo'}
            onClick={handleCardClick}
        >
            {project.url && (
                <div className="projects__live">Live Project</div>
            )}
            {project.status === 'repo' && !project.url && (
                <div className="projects__repo">GitHub Repo</div>
            )}
            {project.image && (
                <img src={project.image} alt={project.title} />
            )}
            <h3>
                {project.title}
            </h3>
            <p>{project.description.substring(0, 150)}...</p>
            {project.tags && (
                <div className="projects__tags">
                    {project.tags.map((tag: string) => (
                        <span
                            key={tag}
                            className="projects__tag"
                        >
                            {tag}
                        </span>
                    ))}
                </div>
            )}
            <div className="projects__links">
                {project.url && (
                    <a
                        href={project.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()} // Prevent card click
                    >
                        Live Site
                    </a>
                )}
                {project.apiUrl && (
                    <a
                        href={project.apiUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()} // Prevent card click
                    >
                        API
                    </a>
                )}
                {project.repoUrl && (
                    <a
                        href={project.repoUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()} // Prevent card click
                    >
                        GitHub
                    </a>
                )}
            </div>
        </div>
    );
};

export default ProjectCard;

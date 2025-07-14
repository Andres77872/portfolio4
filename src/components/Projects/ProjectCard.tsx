import React from 'react';
import { Project } from './types';
import ProjectLinkButtons from './ProjectLinkButtons';
import '../../css/components/projects/ProjectCard.css';

interface ProjectCardProps {
    project: Project;
    onCardClick: (project: Project) => void;
    onTagClick: (tag: string) => void;
    selectedTags: string[];
}

const ProjectCard: React.FC<ProjectCardProps> = ({ project, onCardClick, onTagClick, selectedTags }) => {
    const handleCardClick = () => {
        onCardClick(project);
    };
    
    const handleTagClick = (tag: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevent card click when tag is clicked
        onTagClick(tag);
    };
    
    return (
        <div 
            className={`${project.url ? 'projects__card--live' : 'projects__card--repo'} ${project.tags?.some(tag => selectedTags.includes(tag.toUpperCase())) ? 'projects__card--selected' : ''}`}
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
                            className={`projects__tag ${selectedTags.includes(tag.toUpperCase()) ? 'projects__tag--selected' : ''}`}
                            onClick={(e) => handleTagClick(tag, e)}
                        >
                            {tag}
                        </span>
                    ))}
                </div>
            )}
            <ProjectLinkButtons 
                repoUrl={project.repoUrl} 
                apiUrl={project.apiUrl} 
                url={project.url} 
                stopPropagation={true} 
            />
        </div>
    );
};

export default ProjectCard;

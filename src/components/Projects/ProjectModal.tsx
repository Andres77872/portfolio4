import React from 'react';
import ReactMarkdown from 'react-markdown';
import ProjectLinkButtons from './ProjectLinkButtons';
import '../../css/components/projects/ProjectModal.css';
import { Project } from './types';

interface ProjectModalProps {
    project: Project;
    isOpen: boolean;
    onClose: () => void;
    selectedTags: string[];
}

const ProjectModal: React.FC<ProjectModalProps> = ({ 
    project, 
    isOpen, 
    onClose,
    selectedTags
}) => {
    if (!isOpen) return null;

    return (
        <div className="project-modal">
            <div className="project-modal__overlay" onClick={onClose}></div>
            <div className="project-modal__content">
                <button className="project-modal__close" onClick={onClose}>
                    &times;
                </button>

                {project.image && (
                    <img 
                        src={project.image} 
                        alt={project.title} 
                        className="project-modal__image" 
                    />
                )}

                <h2 className="project-modal__title">
                    {project.title}
                </h2>

                <div className="project-modal__description">
                    <ReactMarkdown>{project.descriptionMD}</ReactMarkdown>
                </div>

                {project.tags && (
                    <div className="projects__tags project-modal__tags">
                        {project.tags.map((tag: string) => (
                            <span
                                key={tag}
                                className={`projects__tag ${
                                    selectedTags.includes(tag.toUpperCase())
                                        ? 'projects__tag--active'
                                        : ''
                                } projects__tag--modal`}
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
                />
            </div>
        </div>
    );
};

export default ProjectModal;

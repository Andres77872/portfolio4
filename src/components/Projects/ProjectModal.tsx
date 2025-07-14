import React from 'react';
import ReactMarkdown from 'react-markdown';
import '../../css/components/projects/ProjectModal.css';
// Importing from local types file
import { Project } from './types.ts';

interface ProjectModalProps {
    project: Project;
    isOpen: boolean;
    onClose: () => void;
    selectedTag: string;
}

const ProjectModal: React.FC<ProjectModalProps> = ({ 
    project, 
    isOpen, 
    onClose,
    selectedTag
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
                                    selectedTag === tag
                                        ? 'projects__tag--active'
                                        : ''
                                } projects__tag--modal`}
                            >
                                {tag}
                            </span>
                        ))}
                    </div>
                )}

                <div className="projects__links project-modal__links">
                    {project.url && (
                        <a
                            href={project.url}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            Live Site
                        </a>
                    )}
                    {project.apiUrl && (
                        <a
                            href={project.apiUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            API
                        </a>
                    )}
                    {project.repoUrl && (
                        <a
                            href={project.repoUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                        >
                            GitHub
                        </a>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProjectModal;

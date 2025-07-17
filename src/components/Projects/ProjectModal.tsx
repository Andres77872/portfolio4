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
                
                <div className="project-modal__metadata">
                    {project.status && (
                        <div className="project-modal__metadata-item">
                            <span className="project-modal__metadata-label">Status:</span>
                            <span className={`project-modal__metadata-value project-modal__status project-modal__status--${project.status}`}>
                                {project.status === 'production' ? 'Production' : 'Repository'}
                            </span>
                        </div>
                    )}
                    
                    {project.language && project.language.length > 0 && (
                        <div className="project-modal__metadata-item">
                            <span className="project-modal__metadata-label">Languages:</span>
                            <div className="project-modal__language-tags">
                                {project.language.map((lang, index) => (
                                    <span key={index} className="project-modal__language-tag">{lang}</span>
                                ))}
                            </div>
                        </div>
                    )}
                    
                    {project.license && (
                        <div className="project-modal__metadata-item">
                            <span className="project-modal__metadata-label">License:</span>
                            <span className="project-modal__metadata-value">{project.license}</span>
                        </div>
                    )}
                    
                    {project.releaseDate && (
                        <div className="project-modal__metadata-item">
                            <span className="project-modal__metadata-label">Released:</span>
                            <span className="project-modal__metadata-value">{project.releaseDate}</span>
                        </div>
                    )}
                    
                    {project.auth && (
                        <div className="project-modal__metadata-item">
                            <span className="project-modal__metadata-label">Authentication:</span>
                            <div className="project-modal__auth-info">
                                {project.auth.login && <span className="project-modal__auth-badge">Login</span>}
                                {project.auth.register && <span className="project-modal__auth-badge">Register</span>}
                                {!project.auth.login && !project.auth.register && <span className="project-modal__auth-badge project-modal__auth-badge--none">None</span>}
                            </div>
                        </div>
                    )}
                </div>

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
